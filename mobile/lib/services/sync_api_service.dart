import 'dart:async';
import 'package:dio/dio.dart';
import '../models/ticket_model.dart';
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
      throw ('Lỗi: Không thể tải danh sách vé');
    }
  }

  /// Hàm gọi API scan trực tiếp vào data
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
      throw Exception('Scan failed');
    }
  }

  /// Đồng bộ hàng loạt từ sync_queue
  /// Gọi mỗi 5s trong background sync
  Future<Map<String, dynamic>> batchSync(List<Map<String, dynamic>> pendingQueue) async {
    try {
      final response = await _dio.post(
        '/tickets/sync/batch',
        data: {
          'queue': pendingQueue,
          'syncedAt': DateTime.now().toIso8601String(),
        },
      );
      return response.data;
    } catch (e) {
      throw Exception('Batch sync failed');
    }
  }

  /// Kéo các thay đổi từ Server
  /// Gọi mỗi 5s để cập nhật local
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
      throw Exception('Get changes failed: $e');
    }
  }
}