import 'package:dio/dio.dart';
import '../models/concert_model.dart';
import 'dio_client.dart';

class ConcertApiService {
  static final ConcertApiService _instance = ConcertApiService._internal();
  factory ConcertApiService() => _instance;
  ConcertApiService._internal();

  final Dio _dio = DioClient().private;

  // Lấy danh sách concert
  Future<List<ConcertModel>> fetchConcerts() async {
    try {

      print('[ConcertApiService] Gọi API: GET /concerts');
      final response = await _dio.get('/concerts');
      print('[ConcertApiService] Response status: ${response.statusCode}');

      final List<dynamic> data = response.data;
      return data.map((json) => ConcertModel.fromJson(json)).toList();
    } catch (e) {
      print('[ConcertApiService] Lỗi: $e');
      throw Exception('Không thể tải danh sách sự kiện: $e');
    }
  }
}