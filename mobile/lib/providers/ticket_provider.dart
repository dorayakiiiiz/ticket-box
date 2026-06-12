import 'package:flutter/material.dart';
import '../repositories/ticket_repository.dart';
import '../models/ticket_model.dart';

class TicketProvider extends ChangeNotifier {
  final TicketRepository _repository = TicketRepository();
  
  // State
  bool _isSyncing = false;
  bool _isValidating = false;
  String? _syncError;
  String? _validationMessage;
  bool _validationSuccess = false;
  
  // Getters
  bool get isSyncing => _isSyncing;
  bool get isValidating => _isValidating;
  String? get syncError => _syncError;
  String? get validationMessage => _validationMessage;
  bool get validationSuccess => _validationSuccess;
  

  Future<bool> syncTickets(String concertId) async {
    _isSyncing = true;
    _syncError = null;
    notifyListeners();
    
    try {
      await _repository.syncTicketsOffline(concertId);
      _isSyncing = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isSyncing = false;
      _syncError = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  // Xác thực vé (khi quét QR)
  Future<Map<String, dynamic>> validateTicket(String qrCode) async {
    _isValidating = true;
    _validationMessage = null;
    _validationSuccess = false;
    notifyListeners();
    
    try {
      // 1. Tìm vé trong database
      final ticket = await _repository.getTicketByQr(qrCode);
      
      if (ticket == null) {
        _isValidating = false;
        _validationMessage = '❌ Mã vé không tồn tại';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Mã vé không tồn tại'};
      }
      
      // 2. Kiểm tra trạng thái
      if (ticket.status == 'CHECKED_IN') {
        _isValidating = false;
        _validationMessage = '❌ Vé đã được sử dụng';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Vé đã được sử dụng'};
      }
      
      // 3. Hợp lệ → đánh dấu đã check-in
      await _repository.markTicketAsCheckedIn(qrCode);
      
      _isValidating = false;
      _validationMessage = '✅ VÉ HỢP LỆ!';
      _validationSuccess = true;
      notifyListeners();
      
      return {'success': true, 'message': 'VÉ HỢP LỆ!'};
      
    } catch (e) {
      _isValidating = false;
      _validationMessage = '❌ Lỗi: $e';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }
  
  // Đồng bộ kết quả check-in lên server (background)
  Future<void> syncPendingCheckins(String token) async {
    await _repository.syncPendingCheckins(token);
  }
  
  // Xóa message sau khi hiển thị
  void clearValidationMessage() {
    _validationMessage = null;
    _validationSuccess = false;
    notifyListeners();
  }
  
  void clearSyncError() {
    _syncError = null;
    notifyListeners();
  }
}