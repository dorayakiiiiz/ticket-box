import 'dart:async';
import 'package:dio/dio.dart';
import '../models/ticket_model.dart';
import '../models/guest_model.dart';
import 'dio_client.dart';

class SyncApiService {
  static final SyncApiService _instance = SyncApiService._internal();
  factory SyncApiService() => _instance;
  SyncApiService._internal();

  // Dùng private Dio
  final Dio _dio = DioClient().private;

  /// Lấy danh sách tickets của concert
  Future<List<TicketModel>> fetchTickets(String concertId) async {
    try {
      final response = await _dio.get('/tickets/sync/$concertId');
      final List<dynamic> data = response.data;
      return data.map((json) => TicketModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Lỗi: Không thể tải danh sách vé');
    }
  }

  /// Lấy danh sách khách mời (Guest) của concert
  Future<List<GuestModel>> fetchGuests(String concertId) async {
    try {
      final response = await _dio.get('/guests/sync/$concertId');
      final List<dynamic> data = response.data;
      return data.map((json) => GuestModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Không thể tải danh sách khách mời');
    }
  }

  /// Hàm gọi API scan ticket
  Future<Map<String, dynamic>> scanTicket({
    required String ticketId,
    required String concertId,
  }) async {
    try {
      final response = await _dio.post(
        '/tickets/scan',
        data: {
          'ticketId': ticketId,
          'concertId': concertId,
          'scannedAt': DateTime.now().toIso8601String(),
        },
        options: Options(
          sendTimeout: const Duration(seconds: 2),
          receiveTimeout: const Duration(seconds: 2),
        ),
      );
      return response.data;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw TimeoutException('Timeout');
      }
      // Ném lại lỗi để xử lý ở tầng trên
      rethrow;
    }
  }

  /// Hàm gọi API scan guest
  Future<Map<String, dynamic>> scanGuest({
    required String guestId,
    required String concertId,
  }) async {
    try {
      final response = await _dio.post(
        '/guests/scan',
        data: {
          'guestId': guestId,
          'concertId': concertId,
          'scannedAt': DateTime.now().toIso8601String(),
        },
        options: Options(
          sendTimeout: const Duration(seconds: 2),
          receiveTimeout: const Duration(seconds: 2),
        ),
      );
      return response.data;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw TimeoutException('Timeout');
      }
      // Ném lại lỗi để xử lý ở tầng trên
      rethrow;
    }
  }

  /// Đồng bộ hàng loạt ticket từ ticket_pending_queue
  Future<Map<String, dynamic>> batchSyncTickets(List<Map<String, dynamic>> pendingQueue) async {
    try {
      final response = await _dio.post(
        '/tickets/sync/batch',
        data: {
          'queue': pendingQueue,
          'type': 'TICKET',
          'syncedAt': DateTime.now().toIso8601String(),
        },
      );
      return response.data;
    } catch (e) {
      throw Exception('Batch sync tickets failed: $e');
    }
  }

  /// Đồng bộ hàng loạt guest từ guest_pending_queue
  Future<Map<String, dynamic>> batchSyncGuests(List<Map<String, dynamic>> pendingQueue) async {
    try {
      final response = await _dio.post(
        '/guests/sync/batch',
        data: {
          'queue': pendingQueue,
          'type': 'GUEST',
          'syncedAt': DateTime.now().toIso8601String(),
        },
      );
      return response.data;
    } catch (e) {
      throw Exception('Batch sync guests failed: $e');
    }
  }

  /// Kéo các thay đổi của Ticket từ Server
  Future<List<Map<String, dynamic>>> getChangesSince({
    required String concertId,
    required DateTime since,
  }) async {
    try {
      final response = await _dio.get(
        '/tickets/changes',
        queryParameters: {
          'concertId': concertId,
          'since': since.toIso8601String(),
        },
      );
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Get ticket changes failed: $e');
    }
  }

  /// Kéo các thay đổi của Guest từ Server
  Future<List<Map<String, dynamic>>> getGuestChangesSince({
    required String concertId,
    required DateTime since,
  }) async {
    try {
      final response = await _dio.get(
        '/guests/changes',
        queryParameters: {
          'concertId': concertId,
          'since': since.toIso8601String(),
        },
      );
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Get guest changes failed: $e');
    }
  }
}