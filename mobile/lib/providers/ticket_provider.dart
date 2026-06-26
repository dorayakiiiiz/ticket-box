import 'package:flutter/material.dart';
import '../repositories/ticket_repository.dart';
import '../models/ticket_model.dart';
import '../models/guest_model.dart';
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

  // Guest State
  bool _isGuestSyncing = false;
  bool _isGuestValidating = false;
  String? _guestSyncError;
  String? _guestValidationMessage;
  bool _guestValidationSuccess = false;
  bool _isGuestOfflineMode = false;

  // Getters - Ticket
  bool get isSyncing => _isSyncing;
  bool get isValidating => _isValidating;
  String? get syncError => _syncError;
  String? get validationMessage => _validationMessage;
  bool get validationSuccess => _validationSuccess;
  bool get isOfflineMode => _isOfflineMode;

  // Getters - Guest
  bool get isGuestSyncing => _isGuestSyncing;
  bool get isGuestValidating => _isGuestValidating;
  String? get guestSyncError => _guestSyncError;
  String? get guestValidationMessage => _guestValidationMessage;
  bool get guestValidationSuccess => _guestValidationSuccess;
  bool get isGuestOfflineMode => _isGuestOfflineMode;

  // ============ PHÂN BIỆT LOẠI VÉ ============

  /// Xác định loại vé dựa vào format
  String _determineTicketType(String qrCode) {
    // VIP Guest: bắt đầu bằng VIP-
    print(qrCode);
    if (qrCode.startsWith('VIP')) {
      return 'GUEST';
    }
    return 'TICKET';
  }

  // ============ TICKET METHODS ============

  /// Tải toàn bộ vé từ server về local
  Future<bool> syncTickets(String concertId) async {
    _isSyncing = true;
    _syncError = null;
    _currentConcertId = concertId;
    notifyListeners();

    try {
      await _repository.syncTicketsOffline(concertId);
      await _repository.syncGuestsOffline(concertId);
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

  ///TỰ ĐỘNG PHÂN BIỆT LOẠI VÉ
  Future<Map<String, dynamic>> scanQR(String qrCode) async {
    // Xác định loại vé
    final type = _determineTicketType(qrCode);

    print(' Scan QR: $qrCode -> Type: $type');

    if (type == 'TICKET') {
      return await validateTicket(qrCode);
    } else if (type == 'GUEST') {
      return await validateGuest(qrCode);
    } else {
      // Không xác định được -> thử check cả 2
      return await _scanUnknownQR(qrCode);
    }
  }

  /// Xác thực vé - Online-First
  Future<Map<String, dynamic>> validateTicket(String qrCode) async {
    _isValidating = true;
    _validationMessage = null;
    _validationSuccess = false;
    _isOfflineMode = false;
    notifyListeners();

    try {
      final localTicket = await _repository.getTicketByQr(qrCode);
      if (localTicket == null) {
        _isValidating = false;
        _validationMessage = 'Mã vé không tồn tại';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Mã vé không tồn tại', 'type': 'TICKET'};
      }

      if (localTicket.status == 'CHECKED_IN') {
        _isValidating = false;
        _validationMessage = 'Vé đã được sử dụng';
        _validationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Vé đã được sử dụng', 'type': 'TICKET'};
      }

      try {
        final result = await _repository.scanTicket(
          ticketId: localTicket.id,
          concertId: _currentConcertId ?? '',
        );

        await _repository.markTicketAsCheckedIn(localTicket.id);

        _isValidating = false;
        _validationMessage = 'VÉ HỢP LỆ!';
        _validationSuccess = true;
        _isOfflineMode = false;
        notifyListeners();

        return {
          'success': true,
          'message': 'VÉ HỢP LỆ!',
          'type': 'TICKET',
          'data': result,
        };
      } on TimeoutException catch (_) {
        return await _handleOfflineTicketScan(qrCode);
      } catch (e) {
        // Kiểm tra lỗi đã check-in từ server
        final errorMsg = e.toString().toLowerCase();
        if (errorMsg.contains('already checked in') ||
            errorMsg.contains('đã sử dụng') ||
            errorMsg.contains('used')) {

          // Cập nhật lại trạng thái local
          await _repository.markTicketAsCheckedIn(localTicket.id);

          _isValidating = false;
          _validationMessage = 'Vé đã được sử dụng';
          _validationSuccess = false;
          notifyListeners();
          return {'success': false, 'message': 'Vé đã được sử dụng', 'type': 'TICKET'};
        }

        return await _handleOfflineTicketScan(qrCode);
      }

    } catch (e) {
      _isValidating = false;
      _validationMessage = 'Lỗi: ${e.toString()}';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Lỗi: ${e.toString()}', 'type': 'TICKET'};
    }
  }

  /// Xử lý Offline Fallback cho Ticket
  Future<Map<String, dynamic>> _handleOfflineTicketScan(String qrCode) async {
    final localTicket = await _repository.getTicketByQr(qrCode);
    if (localTicket == null) {
      _isValidating = false;
      _validationMessage = 'Mã vé không tồn tại';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Mã vé không tồn tại', 'type': 'TICKET'};
    }

    if (localTicket.status == 'CHECKED_IN') {
      _isValidating = false;
      _validationMessage = 'Vé đã được sử dụng';
      _validationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Vé đã được sử dụng', 'type': 'TICKET'};
    }

    await _repository.markTicketAsCheckedIn(localTicket.id);
    // Thêm vào pending queue cho TICKET
    await _repository.addTicketToPendingQueue(
      ticketId: localTicket.id,
      action: 'CHECK_IN',
    );

    _isValidating = false;
    _validationMessage = 'VÉ HỢP LỆ! (Offline)';
    _validationSuccess = true;
    _isOfflineMode = true;
    notifyListeners();

    return {
      'success': true,
      'message': 'VÉ HỢP LỆ! (Offline mode)',
      'type': 'TICKET',
      'isOffline': true,
    };
  }

  /// Cập nhật local từ dữ liệu Server (Ticket)
  Future<void> updateLocalTicketFromServer(Map<String, dynamic> serverTicket) async {
    final localTicket = await _repository.getTicketByQr(serverTicket['qrCode']);
    if (localTicket == null) {
      final ticket = TicketModel.fromJson(serverTicket);
      await _repository.saveTickets([ticket]);
      return;
    }

    if (serverTicket['status'] == 'CHECKED_IN' && localTicket.status != 'CHECKED_IN') {
      await _repository.markTicketAsCheckedIn(serverTicket['qrCode']);
    }
  }

  // ============ GUEST METHODS ============

  /// Tải toàn bộ guest từ server về local
  Future<bool> syncGuests(String concertId) async {
    _isGuestSyncing = true;
    _guestSyncError = null;
    _currentConcertId = concertId;
    notifyListeners();

    try {
      await _repository.syncGuestsOffline(concertId);
      _isGuestSyncing = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isGuestSyncing = false;
      _guestSyncError = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Xác thực Guest - Online-First
  Future<Map<String, dynamic>> validateGuest(String guestCode) async {
    _isGuestValidating = true;
    _guestValidationMessage = null;
    _guestValidationSuccess = false;
    _isGuestOfflineMode = false;
    notifyListeners();

    try {
      final localGuest = await _repository.getGuestByCode(guestCode);
      if (localGuest == null) {
        _isGuestValidating = false;
        _guestValidationMessage = 'Khách mời không tồn tại';
        _guestValidationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Khách mời không tồn tại', 'type': 'GUEST'};
      }

      if (localGuest.isCheckedIn) {
        _isGuestValidating = false;
        _guestValidationMessage = 'Khách mời đã check-in';
        _guestValidationSuccess = false;
        notifyListeners();
        return {'success': false, 'message': 'Khách mời đã check-in', 'type': 'GUEST'};
      }

      // Gọi API scan guest
      try {
        final result = await _repository.scanGuest(
          guestId: localGuest.id,
          concertId: _currentConcertId ?? '',
        );

        // Đánh dấu check-in local
        await _repository.markGuestAsCheckedIn(localGuest.guestCode);

        _isGuestValidating = false;
        _guestValidationMessage = 'CHECK-IN THÀNH CÔNG!';
        _guestValidationSuccess = true;
        _isGuestOfflineMode = false;
        notifyListeners();

        return {
          'success': true,
          'message': 'CHECK-IN THÀNH CÔNG!',
          'type': 'GUEST',
          'data': {
            'guest': localGuest,
            'result': result,
          },
        };
      } on TimeoutException catch (_) {
        return await _handleGuestOfflineScan(guestCode);
      } catch (e) {
        // Kiểm tra lỗi đã check-in từ server
        final errorMsg = e.toString().toLowerCase();
        if (errorMsg.contains('already checked in') ||
            errorMsg.contains('đã check-in') ||
            errorMsg.contains('checked in')) {

          // Cập nhật lại trạng thái local
          await _repository.markGuestAsCheckedIn(localGuest.guestCode);

          _isGuestValidating = false;
          _guestValidationMessage = 'Khách mời đã check-in';
          _guestValidationSuccess = false;
          notifyListeners();
          return {'success': false, 'message': 'Khách mời đã check-in', 'type': 'GUEST'};
        }

        return await _handleGuestOfflineScan(guestCode);
      }

    } catch (e) {
      _isGuestValidating = false;
      _guestValidationMessage = 'Lỗi: ${e.toString()}';
      _guestValidationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Lỗi: ${e.toString()}', 'type': 'GUEST'};
    }
  }

  /// Xử lý Offline Fallback cho Guest
  Future<Map<String, dynamic>> _handleGuestOfflineScan(String guestCode) async {
    final localGuest = await _repository.getGuestByCode(guestCode);
    if (localGuest == null) {
      _isGuestValidating = false;
      _guestValidationMessage = 'Khách mời không tồn tại';
      _guestValidationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Khách mời không tồn tại', 'type': 'GUEST'};
    }

    if (localGuest.isCheckedIn) {
      _isGuestValidating = false;
      _guestValidationMessage = 'Khách mời đã check-in';
      _guestValidationSuccess = false;
      notifyListeners();
      return {'success': false, 'message': 'Khách mời đã check-in', 'type': 'GUEST'};
    }

    // Đánh dấu check-in local
    await _repository.markGuestAsCheckedIn(localGuest.guestCode);

    // Thêm vào pending queue cho GUEST
    await _repository.addGuestToPendingQueue(
      guestId: localGuest.id,
      action: 'CHECK_IN',
    );

    _isGuestValidating = false;
    _guestValidationMessage = 'CHECK-IN THÀNH CÔNG! (Offline)';
    _guestValidationSuccess = true;
    _isGuestOfflineMode = true;
    notifyListeners();

    return {
      'success': true,
      'message': 'CHECK-IN THÀNH CÔNG! (Offline mode)',
      'type': 'GUEST',
      'isOffline': true,
    };
  }

  /// Cập nhật local guest từ Server
  Future<void> updateLocalGuestFromServer(Map<String, dynamic> serverGuest) async {
    final localGuest = await _repository.getGuestByCode(serverGuest['guestCode']);
    if (localGuest == null) {
      final guest = GuestModel.fromJson(serverGuest);
      await _repository.saveGuest(guest);
      return;
    }

    if (serverGuest['isCheckedIn'] == true && !localGuest.isCheckedIn) {
      await _repository.markGuestAsCheckedIn(serverGuest['guestCode']);
    }
  }

  /// Xử lý QR không xác định được loại
  Future<Map<String, dynamic>> _scanUnknownQR(String qrCode) async {
    print('⚠️ Unknown QR type, trying both tables: $qrCode');

    // Thử check ticket trước
    final ticket = await _repository.getTicketByQr(qrCode);
    if (ticket != null) {
      return await validateTicket(qrCode);
    }

    // Thử check guest
    final guest = await _repository.getGuestByCode(qrCode);
    if (guest != null) {
      return await validateGuest(qrCode);
    }

    return {
      'success': false,
      'message': 'QR Code không hợp lệ',
      'type': 'UNKNOWN',
    };
  }

  // ============ CLEAR METHODS ============

  void clearValidationMessage() {
    _validationMessage = null;
    _validationSuccess = false;
    _isOfflineMode = false;
    notifyListeners();
  }

  void clearGuestValidationMessage() {
    _guestValidationMessage = null;
    _guestValidationSuccess = false;
    _isGuestOfflineMode = false;
    notifyListeners();
  }

  void clearSyncError() {
    _syncError = null;
    notifyListeners();
  }

  void clearGuestSyncError() {
    _guestSyncError = null;
    notifyListeners();
  }

  /// Xóa tất cả lỗi
  void clearAllErrors() {
    _syncError = null;
    _guestSyncError = null;
    _validationMessage = null;
    _guestValidationMessage = null;
    _validationSuccess = false;
    _guestValidationSuccess = false;
    _isOfflineMode = false;
    _isGuestOfflineMode = false;
    notifyListeners();
  }
}