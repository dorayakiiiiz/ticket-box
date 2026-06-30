import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;
  DioClient._internal();

  late final Dio _publicDio;
  late final Dio _privateDio;
  late final CookieJar _cookieJar;

  Dio get public => _publicDio;
  Dio get private => _privateDio;

  void init() {
    _cookieJar = CookieJar();

    // Public Dio
    _publicDio = Dio(
      BaseOptions(
        //baseUrl: 'http://10.0.2.2:8080',
        baseUrl: 'https://ticket-box-q762.onrender.com',
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    _publicDio.interceptors.add(CookieManager(_cookieJar));

    // Private Dio
    _privateDio = Dio(
      BaseOptions(
        //baseUrl: 'http://10.0.2.2:8080',
        baseUrl: 'https://api-ticketbox.onrender.com',
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    _privateDio.interceptors.add(CookieManager(_cookieJar));

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

  void clearCookies() {
    _cookieJar.deleteAll();
  }

  // Set token cho private Dio
  void setAuthToken(String token) {
    _privateDio.options.headers['Authorization'] = 'Bearer $token';
  }

  // Xóa token
  void clearAuthToken() {
    _privateDio.options.headers.remove('Authorization');
  }
}
