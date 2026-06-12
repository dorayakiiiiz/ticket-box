import 'package:dio/dio.dart';
import '../models/concert_model.dart';
import 'dio_client.dart';

class ConcertApiService {
  static final ConcertApiService _instance = ConcertApiService._internal();
  factory ConcertApiService() => _instance;
  ConcertApiService._internal();

  // Dùng private Dio từ DioClient
  final Dio _dio = DioClient().private;

  // Lấy danh sách concert
  Future<List<ConcertModel>> fetchConcerts() async {
    try {
      print('📡 [ConcertApiService] Gọi API: GET /concerts');
      print('🔑 Token hiện tại: ${_dio.options.headers['Authorization']}');

      final response = await _dio.get('/concerts');

      print('✅ [ConcertApiService] Response status: ${response.statusCode}');
      print('📦 [ConcertApiService] Số lượng concert nhận được: ${(response.data as List).length}');

      final List<dynamic> data = response.data;
      return data.map((json) => ConcertModel.fromJson(json)).toList();
    } catch (e) {
      print('❌ [ConcertApiService] Lỗi: $e');
      if (e is DioException) {
        print('📡 [ConcertApiService] Status code: ${e.response?.statusCode}');
        print('📝 [ConcertApiService] Response data: ${e.response?.data}');
      }
      throw Exception('Không thể tải danh sách sự kiện: $e');
    }
  }
}