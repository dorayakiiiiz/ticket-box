import 'package:dio/dio.dart';
import '../models/ticket_model.dart';
import 'dio_client.dart';

class SyncApiService {
  static final SyncApiService _instance = SyncApiService._internal();
  factory SyncApiService() => _instance;
  SyncApiService._internal();

  // Dùng private Dio từ DioClient
  final Dio _dio = DioClient().private;

  // Lấy danh sách tickets của concert
  Future<List<TicketModel>> fetchTickets(String concertId) async {
    try {
      final response = await _dio.get('/tickets/sync/$concertId');
      final List<dynamic> data = response.data;
      return data.map((json) => TicketModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Không thể tải danh sách vé: $e');
    }
  }

  // Gửi danh sách vé đã check-in lên server
  Future<void> syncCheckins(List<Map<String, dynamic>> checkins) async {
    try {
      await _dio.post('/sync/checkins', data: {'checkins': checkins});
    } catch (e) {
      throw Exception('Không thể đồng bộ kết quả check-in: $e');
    }
  }
}