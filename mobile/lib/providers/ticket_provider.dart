import 'package:flutter/material.dart';
import '../repositories/ticket_repository.dart';
import '../models/ticket_model.dart';
import 'dart:async';

class TicketProvider extends ChangeNotifier {
  final TicketRepository _repository = TicketRepository();

  // State
  bool _isSyncing = false;
  bool _isValidating = false;
  String? _syncError;
  String? _validationMessage;
  bool _validationSuccess = false;
  bool _isOfflineMode = false;
  String? _currentConcertId;

  // Getters
  bool get isSyncing => _isSyncing;
  bool get isValidating => _isValidating;
  String? get syncError => _syncError;
  String? get validationMessage => _validationMessage;
  bool get validationSuccess => _validationSuccess;
  bool get isOfflineMode => _isOfflineMode;


  /// Tải toàn bộ vé từ server về local
  Future<bool> syncTickets(String concertId) async {
    _isSyncing = true;
    _syncError = null;
    _currentConcertId = concertId;
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

  // ============ QUÉT VÉ (ONLINE-FIRST + OFFLINE FALLBACK) ============

  /// Xác thực vé - Online-First
  Future<Map<String, dynamic>> validateTicket(String qrCode) async {
    _isValidating = true;
    _validationMessage = null;
    _validationSuccess = false;
    _isOfflineMode = false;
    notifyListeners();

    try {

      ///Kiểm tra xem vé có tồn tại trong dữ liệu không
      final localTicket = await _repository.getTicketByQr(qrCode);
      if (localTicket == null) {
        _isValidating = false;
        _validationMessage = 'Mã vé không tồn tại';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Mã vé không tồn tại'};
      }

      // Nếu vé đã CHECKED_IN => từ chối vào cổng
      if (localTicket.status == 'CHECKED_IN') {
        _isValidating = false;
        _validationMessage = 'Vé đã được sử dụng';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Vé đã được sử dụng'};
      }

      // Gọi scan
      try {
        final result = await _repository.scanTicket(
          ticketId: localTicket.id,
          concertId: _currentConcertId ?? '',
        );

        // Cập nhật local nếu thành công
        await _repository.markTicketAsCheckedIn(localTicket.id);

        _isValidating = false;
        _validationMessage = 'VÉ HỢP LỆ!';
        _validationSuccess = true;
        _isOfflineMode = false;
        notifyListeners();

        return {
          'success': true,
          'message': 'VÉ HỢP LỆ!',
          'data': result,
        };
      } on TimeoutException catch (_) {
        return await _handleOfflineScan(qrCode);
      } catch (e) {
        return await _handleOfflineScan(qrCode);
      }

    } catch (e) {
      _isValidating = false;
      _validationMessage = 'Lỗi';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  /// Xử lý Offline Fallback khi không có mạng
  Future<Map<String, dynamic>> _handleOfflineScan(String qrCode) async {

    // Kiểm tra lại local
    final localTicket = await _repository.getTicketByQr(qrCode);
    if (localTicket == null) {
      _isValidating = false;
      _validationMessage = 'Mã vé không tồn tại';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Mã vé không tồn tại'};
    }

    if (localTicket.status == 'CHECKED_IN') {
      _isValidating = false;
      _validationMessage = 'Vé đã được sử dụng';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Vé đã được sử dụng'};
    }

    // Đánh dấu CHECKED_IN trong local
    await _repository.markTicketAsCheckedIn(localTicket.id);

    // Thêm vào sync_queue qua repository để chờ đồng bộ
    await _repository.addToPendingQueue(
      ticketId: localTicket.id,
      type: 'TICKET',
      action: 'CHECK_IN',
    );

    _isValidating = false;
    _validationMessage = 'VÉ HỢP LỆ!';
    _validationSuccess = true;
    _isOfflineMode = true;
    notifyListeners();

    return {
      'success': true,
      'message': 'VÉ HỢP LỆ! (Offline mode)',
      'isOffline': true,
    };
  }

  // ============ CẬP NHẬT LOCAL TỪ SERVER ============

  /// Cập nhật local từ dữ liệu Server (gọi từ NetworkSyncService)
  Future<void> updateLocalTicketFromServer(Map<String, dynamic> serverTicket) async {


    final localTicket = await _repository.getTicketByQr(serverTicket['qrCode']);
    if (localTicket == null) {
      // Nếu chưa có trong local, thêm mới
      final ticket = TicketModel.fromJson(serverTicket);
      await _repository.saveTickets([ticket]);
      return;
    }

    // Nếu Server đã CHECKED_IN → update local
    if (serverTicket['status'] == 'CHECKED_IN' && localTicket.status != 'CHECKED_IN') {
      await _repository.markTicketAsCheckedIn(serverTicket['qrCode']);
    }
  }

  // ============ XÓA MESSAGE ============

  void clearValidationMessage() {
    _validationMessage = null;
    _validationSuccess = false;
    _isOfflineMode = false;
    notifyListeners();
  }

  void clearSyncError() {
    _syncError = null;
    notifyListeners();
  }
}