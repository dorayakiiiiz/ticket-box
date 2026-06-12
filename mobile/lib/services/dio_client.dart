import 'package:dio/dio.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;
  DioClient._internal();

  late final Dio _publicDio;
  late final Dio _privateDio;

  Dio get public => _publicDio;
  Dio get private => _privateDio;

  void init() {
    // Public Dio
    _publicDio = Dio(BaseOptions(
      baseUrl: 'http://10.0.2.2:8080',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    // Private Dio
    _privateDio = Dio(BaseOptions(
      baseUrl: 'http://10.0.2.2:8080',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _privateDio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          return handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            // Token hết hạn hoặc không hợp lệ
            print('Unauthorized! Token may be expired.');
          }
          return handler.next(error);
        },
      ),
    );
  }

  // Set token cho private Dio
  void setAuthToken(String token) {
    token = 'tester';
    _privateDio.options.headers['Authorization'] = 'Bearer $token';
  }

  // Xóa token (khi logout)
  void clearAuthToken() {
    _privateDio.options.headers.remove('Authorization');
  }
}