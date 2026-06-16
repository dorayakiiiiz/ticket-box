import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../repositories/ticket_repository.dart';
import '../services/database_helper.dart';

class NetworkSyncService {
  static final NetworkSyncService _instance = NetworkSyncService._internal();
  factory NetworkSyncService() => _instance;
  NetworkSyncService._internal();

  Timer? _syncTimer;
  final Connectivity _connectivity = Connectivity();
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final TicketRepository _ticketRepository = TicketRepository();

  void startBackgroundSync() {
    // Lắng nghe thay đổi mạng
    _connectivity.onConnectivityChanged.listen((result) async {
      if (result != ConnectivityResult.none) {
        print('Network connected, syncing pending checkins...');
        await _syncPendingCheckins();
      }
    });

    // Hẹn giờ mỗi 1 phút
    _syncTimer = Timer.periodic(const Duration(minutes: 1), (timer) async {
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult != ConnectivityResult.none) {
        await _syncPendingCheckins();
      }
    });
  }

  // Đồng bộ vé chưa sync
  Future<void> _syncPendingCheckins() async {
    try {
      // Lấy vé chưa đồng bộ (status = USED, synced = 0)
      final unsyncedTickets = await _dbHelper.getUnsyncedTickets();

      //Nếu không có vé nào chưa đồng bộ thì sẽ không gọi API
      if (unsyncedTickets.isEmpty) {
        print('📭 No pending checkins to sync');
        return;
      }

      await _ticketRepository.syncPendingCheckins();

      print('Synced ${unsyncedTickets.length} checkins successfully');

    } catch (e) {
      print('Error syncing checkins: $e');
    }
  }

  void stopBackgroundSync() {
    _syncTimer?.cancel();
  }

  void dispose() {
    stopBackgroundSync();
  }
}