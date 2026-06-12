import 'package:dio/dio.dart';
import 'dio_client.dart';

class AuthApiService {
  static final AuthApiService _instance = AuthApiService._internal();
  factory AuthApiService() => _instance;
  AuthApiService._internal();

  // Dùng public Dio từ DioClient (không cần token)
  final Dio _dio = DioClient().public;

  // Đăng nhập
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Sai email hoặc mật khẩu');
      }
      throw Exception('Kết nối thất bại: ${e.message}');
    } catch (e) {
      throw Exception('Đăng nhập thất bại: $e');
    }
  }


  Future<void> logout(String token) async {
    try {
      final privateDio = DioClient().private;
      privateDio.options.headers['Authorization'] = 'Bearer $token';
      await privateDio.post('/auth/logout');
    } catch (e) {
      print('Logout API error: $e');
    }
  }
}