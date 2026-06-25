import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../repositories/ticket_repository.dart';
import '../services/database_helper.dart';
import '../services/sync_api_service.dart';
import '../models/ticket_model.dart';
import '../models/guest_model.dart';

class NetworkSyncService {
  static final NetworkSyncService _instance = NetworkSyncService._internal();
  factory NetworkSyncService() => _instance;
  NetworkSyncService._internal();

  Timer? _syncTimer;
  final Connectivity _connectivity = Connectivity();
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final TicketRepository _ticketRepository = TicketRepository();
  final SyncApiService _apiService = SyncApiService();

  String? _currentConcertId;
  bool _isSyncing = false;
  bool _hasNetwork = false;
  DateTime? _lastSyncTime; // ✅ Lưu thời gian sync cuối

  void startBackgroundSync({String? concertId}) {
    _currentConcertId = concertId;
    print('🔧 startBackgroundSync called. concertId=$_currentConcertId');
    _lastSyncTime = DateTime.now().subtract(
      const Duration(minutes: 5),
    ); // Lần đầu sync 5 phút trước

    // Lắng nghe thay đổi mạng
    _connectivity.onConnectivityChanged.listen((result) async {
      final hasNetwork = result != ConnectivityResult.none;

      if (hasNetwork && !_hasNetwork) {
        print('🟢 Network connected - Starting sync...');
        _hasNetwork = true;
        _startTimer();
        await _syncAllPendingQueues();
      } else if (!hasNetwork && _hasNetwork) {
        print('🔴 Network lost - Stopping sync...');
        _hasNetwork = false;
        _stopTimer();
      }
    });

    // Kiểm tra trạng thái mạng ban đầu
    _checkInitialConnectivity();
  }

  Future<void> _checkInitialConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _hasNetwork = result != ConnectivityResult.none;

    if (_hasNetwork) {
      print('🟢 Initial: Network available');
      _startTimer();
      await _syncAllPendingQueues();
    } else {
      print('🔴 Initial: No network');
      _stopTimer();
    }
  }

  void _startTimer() {
    _stopTimer(); // Đảm bảo không có timer cũ
    _syncTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      print('⏱️ Sync timer fired at ${DateTime.now()}');
      // Kiểm tra mạng trước khi chạy
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        print('🔴 Network lost during timer, stopping...');
        _hasNetwork = false;
        _stopTimer();
        return;
      }

      // Có mạng → Sync
      await _syncAllPendingQueues();
    });

    print('✅ Sync timer started (every 30s)');
  }

  void _stopTimer() {
    _syncTimer?.cancel();
    _syncTimer = null;
    print('⏹️ Sync timer stopped');
  }

  Future<void> _syncAllPendingQueues() async {
    // Tránh chạy đồng thời
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // 1. Đồng bộ ticket queue
      await _syncTicketPendingQueue();

      // 2. Đồng bộ guest queue
      await _syncGuestPendingQueue();

      // 3. Pull changes từ server (nếu có concertId)
      print(
        '🔍 Checking whether to pull changes. concertId=$_currentConcertId',
      );
      if (_currentConcertId != null && _currentConcertId!.isNotEmpty) {
        await _pullChangesFromServer();
      } else {
        print('ℹ️ Skipping pullChanges: no concertId');
      }

      // ✅ Cập nhật thời gian sync cuối
      _lastSyncTime = DateTime.now();
    } catch (e) {
      print('Error syncing: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Đồng bộ ticket pending queue
  Future<void> _syncTicketPendingQueue() async {
    try {
      final pendingTickets = await _dbHelper.getTicketPendingQueue();

      if (pendingTickets.isEmpty) {
        print('No pending ticket checkins to sync');
        return;
      }

      print('Syncing ${pendingTickets.length} ticket checkins...');
      await _ticketRepository.syncTicketPendingQueue();
      print('✅ Synced ${pendingTickets.length} tickets successfully');
    } catch (e) {
      print('Error syncing ticket pending queue: $e');
    }
  }

  /// Đồng bộ guest pending queue
  Future<void> _syncGuestPendingQueue() async {
    try {
      final pendingGuests = await _dbHelper.getGuestPendingQueue();

      if (pendingGuests.isEmpty) {
        print('No pending guest checkins to sync');
        return;
      }

      print('Syncing ${pendingGuests.length} guest checkins...');
      await _ticketRepository.syncGuestPendingQueue();
      print('✅ Synced ${pendingGuests.length} guests successfully');
    } catch (e) {
      print('Error syncing guest pending queue: $e');
    }
  }

  /// Pull changes từ server
  Future<void> _pullChangesFromServer() async {
    try {
      // Dùng _lastSyncTime thay vì DateTime(1970)
      final since =
          _lastSyncTime ?? DateTime.now().subtract(const Duration(hours: 1));

      print('🔄 Pulling changes since: $since');

      // Pull ticket changes
      final ticketChanges = await _apiService.getChangesSince(
        concertId: _currentConcertId!,
        since: since,
      );

      if (ticketChanges.isNotEmpty) {
        print(
          '📥 Pulling ${ticketChanges.length} ticket changes from server...',
        );
        for (var serverTicket in ticketChanges) {
          await _updateLocalTicketFromServer(serverTicket);
        }
        print('✅ Updated local with ${ticketChanges.length} ticket changes');
      } else {
        print('📭 No ticket changes');
      }

      // Pull guest changes
      final guestChanges = await _apiService.getGuestChangesSince(
        concertId: _currentConcertId!,
        since: since,
      );

      if (guestChanges.isNotEmpty) {
        print('📥 Pulling ${guestChanges.length} guest changes from server...');
        for (var serverGuest in guestChanges) {
          await _updateLocalGuestFromServer(serverGuest);
        }
        print('✅ Updated local with ${guestChanges.length} guest changes');
      } else {
        print('📭 No guest changes');
      }
    } catch (e) {
      print('Error pulling changes from server: $e');
    }
  }

  /// Cập nhật local ticket từ server
  Future<void> _updateLocalTicketFromServer(
    Map<String, dynamic> serverTicket,
  ) async {
    final qrCode = serverTicket['qrCode'] ?? serverTicket['id'];
    final localTicket = await _ticketRepository.getTicketByQr(qrCode);

    if (localTicket == null) {
      final ticket = TicketModel.fromJson(serverTicket);
      await _ticketRepository.saveTickets([ticket]);
      print('  ➕ New ticket: ${ticket.qrCode}');
      return;
    }

    if (serverTicket['status'] == 'CHECKED_IN' &&
        localTicket.status != 'CHECKED_IN') {
      await _ticketRepository.markTicketAsCheckedIn(qrCode);
      print('  🔄 Updated ticket: $qrCode -> CHECKED_IN');
    }
  }

  /// Cập nhật local guest từ server
  Future<void> _updateLocalGuestFromServer(
    Map<String, dynamic> serverGuest,
  ) async {
    final guestCode = serverGuest['guestCode'] ?? serverGuest['id'];
    final localGuest = await _ticketRepository.getGuestByCode(guestCode);

    if (localGuest == null) {
      final guest = GuestModel.fromJson(serverGuest);
      await _ticketRepository.saveGuest(guest);
      print('  ➕ New guest: ${guest.guestCode}');
      return;
    }

    if (serverGuest['isCheckedIn'] == true && !localGuest.isCheckedIn) {
      await _ticketRepository.markGuestAsCheckedIn(guestCode);
      print('  🔄 Updated guest: $guestCode -> CHECKED_IN');
    }
  }

  void updateConcertId(String concertId) {
    _currentConcertId = concertId;
    _lastSyncTime = DateTime.now().subtract(
      const Duration(minutes: 5),
    ); // Reset để pull data mới
  }

  void stopBackgroundSync() {
    _stopTimer();
  }

  void dispose() {
    stopBackgroundSync();
  }
}
