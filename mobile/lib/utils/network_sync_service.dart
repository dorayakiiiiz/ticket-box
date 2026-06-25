import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../repositories/ticket_repository.dart';
import '../services/database_helper.dart';
import '../services/sync_api_service.dart';
import '../models/ticket_model.dart';

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

  void startBackgroundSync({String? concertId}) {
    _currentConcertId = concertId;

    _connectivity.onConnectivityChanged.listen((result) async {
      if (result != ConnectivityResult.none) {
        print('Network connected, syncing pending checkins...');
        await _syncPendingCheckins();
      }
    });

    _syncTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult != ConnectivityResult.none) {
        await _syncPendingCheckins();
      }
    });
  }

  Future<void> _syncPendingCheckins() async {
    try {
      final unsyncedTickets = await _dbHelper.getUnsyncedTickets();

      if (unsyncedTickets.isEmpty) {
        print('No pending checkins to sync');
      } else {
        await _ticketRepository.syncPendingQueue();
        print('Synced ${unsyncedTickets.length} checkins successfully');
      }

      if (_currentConcertId != null) {
        final changes = await _apiService.getChangesSince(
          concertId: _currentConcertId!,
          since: DateTime(1970),
        );
        if (changes.isNotEmpty) {
          print('Pulling ${changes.length} changes from server...');
          for (var serverTicket in changes) {
            await _updateLocalTicketFromServer(serverTicket);
          }
          print('Updated local with ${changes.length} changes');
        }
      }

    } catch (e) {
      print('Error syncing checkins: $e');
    }
  }

  Future<void> _updateLocalTicketFromServer(Map<String, dynamic> serverTicket) async {
    final localTicket = await _ticketRepository.getTicketByQr(serverTicket['id']);
    if (localTicket == null) {
      final ticket = TicketModel.fromJson(serverTicket);
      await _ticketRepository.saveTickets([ticket]);
      return;
    }
    if (serverTicket['status'] == 'CHECKED_IN' && localTicket.status != 'CHECKED_IN') {
      await _ticketRepository.markTicketAsCheckedIn(serverTicket['id']);
    }
  }

  void updateConcertId(String concertId) {
    _currentConcertId = concertId;
  }

  void stopBackgroundSync() {
    _syncTimer?.cancel();
  }

  void dispose() {
    stopBackgroundSync();
  }
}