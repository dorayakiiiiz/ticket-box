import 'package:dio/dio.dart';
import 'dio_client.dart';

class AuthApiService {
  static final AuthApiService _instance = AuthApiService._internal();
  factory AuthApiService() => _instance;
  AuthApiService._internal();

  final Dio publicDio = DioClient().public;
  final Dio privateDio = DioClient().private;

  // Đăng nhập
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await publicDio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw ('Sai email hoặc mật khẩu');
      }
      throw ('Không thể kết nối với máy chủ');
    } catch (e) {
      throw ('Đăng nhập thất bại');
    }
  }

  Future<Map<String, dynamic>> updateProfile(String fullName) async {
    try {
      final response = await privateDio.patch(
        '/auth/profile',
        data: {'fullName': fullName},
      );
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw ('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
      }
      if (e.response?.statusCode == 400) {
        final errorMessage = e.response?.data?['message'] ?? 'Tên không hợp lệ';
        throw (errorMessage);
      }
      throw ('Không thể kết nối với máy chủ');
    } catch (e) {
      throw ('Cập nhật thất bại');
    }
  }


  Future<Map<String, dynamic>> changePassword(String currentPassword, String newPassword) async {
    try {
      final response = await privateDio.patch(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Mật khẩu hiện tại không đúng');
      }
      if (e.response?.statusCode == 400) {
        final errorMessage = e.response?.data?['message'] ?? 'Dữ liệu không hợp lệ';
        throw Exception(errorMessage);
      }
      if (e.response?.statusCode == 422) {
        throw Exception('Mật khẩu mới phải có ít nhất 6 ký tự');
      }
      throw Exception('Không thể kết nối với máy chủ');
    } catch (e) {
      throw Exception('Đổi mật khẩu thất bại');
    }
  }

  Future<void> logout() async {
    try {
      await privateDio.post('/auth/logout');
    } catch (e) {
      print('Logout API error');
    }
  }
}


