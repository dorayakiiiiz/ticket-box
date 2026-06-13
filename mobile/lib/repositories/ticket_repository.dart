import '../models/ticket_model.dart';
import '../services/sync_api_service.dart';
import '../services/database_helper.dart';

class TicketRepository {
  final SyncApiService _apiService = SyncApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // Đồng bộ vé offline (tải vé của concert xuống local)
  Future<void> syncTicketsOffline(String concertId) async {
    //Gọi API lấy vé của concert
    final tickets = await _apiService.fetchTickets(concertId);
    
    // Xóa vé cũ
    await _dbHelper.clearAllTickets();
    
    // Lưu vé mới vào database
    await _dbHelper.saveTickets(tickets);
  }

  // Tìm vé bằng QR code
  Future<TicketModel?> getTicketByQr(String qrCode) async {
    return await _dbHelper.getTicketByQr(qrCode);
  }

  // Đánh dấu vé đã check-in
  Future<void> markTicketAsCheckedIn(String qrCode) async {
    await _dbHelper.updateTicketStatus(qrCode, DateTime.now());
  }

  Future<void> syncPendingCheckins() async {
    // Lấy vé chưa sync
    final unsyncedTickets = await _dbHelper.getUnsyncedTickets();

    //if (unsyncedTickets.isEmpty) return;

    // Chuẩn bị dữ liệu
    final checkins = unsyncedTickets.map((ticket) => ({
      'id': ticket.id,
      'timestamp': ticket.checkedInAt
    })).toList();

    await _apiService.syncCheckins(checkins);

    // Đánh dấu đã sync
    final ticketIds = unsyncedTickets.map((t) => t.id).toList();
    await _dbHelper.markTicketsAsSynced(ticketIds);
  }

  // Xóa tất cả vé (dùng khi logout)
  Future<void> clearAllTickets() async {
    await _dbHelper.clearAllTickets();
  }
}