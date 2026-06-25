import '../models/ticket_model.dart';
import '../services/sync_api_service.dart';
import '../services/database_helper.dart';
import 'dart:async';

class TicketRepository {
  final SyncApiService _apiService = SyncApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();


  ///Tải danh sách các ticket từ server vaoaf local
  Future<void> syncTicketsOffline(String concertId) async {
    // Gọi API lấy vé của concert
    final tickets = await _apiService.fetchTickets(concertId);
    // Xóa vé cũ nếu có
    await _dbHelper.clearAllTickets();
    // Lưu danh sách tickets mới vào database
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

  /// Thêm vào sync_queue chờ đồng bộ
  Future<void> addToPendingQueue({
    required String ticketId,
    required String type,
    required String action,
  }) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await _dbHelper.addToPendingQueue(
      id: id,
      ticketId: ticketId,
      type: type,
      action: action,
    );
  }

  /// Đồng bộ pending queue lên Server
  Future<void> syncPendingQueue() async {
    // Lấy tất cả pending từ sync_queue
    final pendingQueue = await _dbHelper.getPendingQueue();
    if (pendingQueue.isEmpty) return;

    final result = await _apiService.batchSync(pendingQueue);

    if (result['success'] == true) {
      // Xóa khỏi sync_queue
      final ids = pendingQueue.map((e) => e['id'] as String).toList();
      await _dbHelper.clearPendingQueue(ids);
    }
  }


  /// Xóa tất cả vé (dùng khi logout)
  Future<void> clearAllTickets() async {
    await _dbHelper.clearAllTickets();
  }

  /// Xóa tất cả pending queue
  Future<void> clearPendingQueue() async {
    final pending = await _dbHelper.getPendingQueue();
    if (pending.isNotEmpty) {
      final ids = pending.map((e) => e['id'] as String).toList();
      await _dbHelper.clearPendingQueue(ids);
    }
  }
}