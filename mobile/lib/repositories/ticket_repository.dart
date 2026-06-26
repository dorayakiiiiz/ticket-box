import '../models/ticket_model.dart';
import '../models/guest_model.dart';
import '../services/sync_api_service.dart';
import '../services/database_helper.dart';
import 'dart:async';

class TicketRepository {
  final SyncApiService _apiService = SyncApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // ============ TICKET METHODS ============

  /// Tải danh sách các ticket từ server vào local
  Future<void> syncTicketsOffline(String concertId) async {
    final tickets = await _apiService.fetchTickets(concertId);
    await _dbHelper.clearAllTickets();
    await _dbHelper.saveTickets(tickets);
  }

  Future<void> saveTickets(List<TicketModel> tickets) async {
    await _dbHelper.saveTickets(tickets);
  }

  /// Tìm vé bằng QR code
  Future<TicketModel?> getTicketByQr(String qrCode) async {
    return await _dbHelper.getTicketByQr(qrCode);
  }

  /// Đánh dấu vé đã check-in (online)
  Future<void> markTicketAsCheckedIn(String ticketId) async {
    await _dbHelper.updateTicketStatus(ticketId, DateTime.now());
  }

  /// Gọi API scan ticket (Online-First)
  Future<Map<String, dynamic>> scanTicket({
    required String ticketId,
    required String concertId,
  }) async {
    return await _apiService.scanTicket(
      ticketId: ticketId,
      concertId: concertId,
    );
  }

  // ============ GUEST METHODS ============

  /// Tải danh sách guest từ server vào local
  Future<void> syncGuestsOffline(String concertId) async {
    final guests = await _apiService.fetchGuests(concertId);
    await _dbHelper.clearAllGuests();
    await _dbHelper.saveGuests(guests);
  }

  /// Lưu danh sách guest vào local
  Future<void> saveGuests(List<GuestModel> guests) async {
    await _dbHelper.saveGuests(guests);
  }

  /// Lưu 1 guest vào local
  Future<void> saveGuest(GuestModel guest) async {
    await _dbHelper.saveGuest(guest);
  }

  /// Tìm guest theo guestCode (QR Code)
  Future<GuestModel?> getGuestByCode(String guestCode) async {
    return await _dbHelper.getGuestByCode(guestCode);
  }

  /// Tìm guest theo email
  Future<GuestModel?> getGuestByEmail(String email) async {
    return await _dbHelper.getGuestByEmail(email);
  }

  /// Lấy tất cả guest
  Future<List<GuestModel>> getAllGuests() async {
    return await _dbHelper.getAllGuests();
  }

  /// Đánh dấu guest đã check-in
  Future<void> markGuestAsCheckedIn(String guestCode) async {
    await _dbHelper.updateGuestCheckIn(guestCode);
  }

  /// Gọi API scan guest (Online-First)
  Future<Map<String, dynamic>> scanGuest({
    required String guestId,
    required String concertId,
  }) async {
    return await _apiService.scanGuest(
      guestId: guestId,
      concertId: concertId,
    );
  }

  /// Lấy danh sách guest đã check-in
  Future<List<GuestModel>> getCheckedInGuests() async {
    return await _dbHelper.getCheckedInGuests();
  }

  /// Lấy danh sách guest chưa đồng bộ
  Future<List<GuestModel>> getUnsyncedGuests() async {
    return await _dbHelper.getUnsyncedGuests();
  }

  /// Đánh dấu guest đã đồng bộ
  Future<void> markGuestsAsSynced(List<String> guestIds) async {
    await _dbHelper.markGuestsAsSynced(guestIds);
  }

  /// Xóa tất cả guest (dùng khi logout)
  Future<void> clearAllGuests() async {
    await _dbHelper.clearAllGuests();
  }

  /// Xóa 1 guest
  Future<void> deleteGuest(String id) async {
    await _dbHelper.deleteGuest(id);
  }

  // ============ TICKET PENDING QUEUE ============

  /// Thêm ticket vào pending queue chờ đồng bộ
  Future<void> addTicketToPendingQueue({
    required String ticketId,
    required String action,
  }) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await _dbHelper.addTicketToPendingQueue(
      id: id,
      ticketId: ticketId,
      action: action,
    );
  }

  /// Lấy danh sách ticket pending queue
  Future<List<Map<String, dynamic>>> getTicketPendingQueue() async {
    return await _dbHelper.getTicketPendingQueue();
  }

  /// Xóa ticket pending queue đã đồng bộ
  Future<void> clearTicketPendingQueue(List<String> ids) async {
    await _dbHelper.clearTicketPendingQueue(ids);
  }

  /// Đồng bộ ticket pending queue lên Server
  Future<void> syncTicketPendingQueue() async {
    final pendingQueue = await _dbHelper.getTicketPendingQueue();
    if (pendingQueue.isEmpty) return;

    final result = await _apiService.batchSyncTickets(pendingQueue);

    if (result['success'] == true) {
      final ids = pendingQueue.map((e) => e['id'] as String).toList();
      await _dbHelper.clearTicketPendingQueue(ids);
    }
  }

  // ============ GUEST PENDING QUEUE ============

  /// Thêm guest vào pending queue chờ đồng bộ
  Future<void> addGuestToPendingQueue({
    required String guestId,
    required String action,
  }) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await _dbHelper.addGuestToPendingQueue(
      id: id,
      guestId: guestId,
      action: action,
    );
  }

  /// Lấy danh sách guest pending queue
  Future<List<Map<String, dynamic>>> getGuestPendingQueue() async {
    return await _dbHelper.getGuestPendingQueue();
  }

  /// Xóa guest pending queue đã đồng bộ
  Future<void> clearGuestPendingQueue(List<String> ids) async {
    await _dbHelper.clearGuestPendingQueue(ids);
  }

  /// Đồng bộ guest pending queue lên Server
  Future<void> syncGuestPendingQueue() async {
    final pendingQueue = await _dbHelper.getGuestPendingQueue();
    if (pendingQueue.isEmpty) return;

    final result = await _apiService.batchSyncGuests(pendingQueue);

    if (result['success'] == true) {
      final ids = pendingQueue.map((e) => e['id'] as String).toList();
      await _dbHelper.clearGuestPendingQueue(ids);
    }
  }

  /// Xóa tất cả vé (dùng khi logout)
  Future<void> clearAllTickets() async {
    await _dbHelper.clearAllTickets();
  }

  /// Xóa tất cả pending queue
  Future<void> clearAllPendingQueues() async {
    final ticketPending = await _dbHelper.getTicketPendingQueue();
    if (ticketPending.isNotEmpty) {
      final ids = ticketPending.map((e) => e['id'] as String).toList();
      await _dbHelper.clearTicketPendingQueue(ids);
    }

    final guestPending = await _dbHelper.getGuestPendingQueue();
    if (guestPending.isNotEmpty) {
      final ids = guestPending.map((e) => e['id'] as String).toList();
      await _dbHelper.clearGuestPendingQueue(ids);
    }
  }
}