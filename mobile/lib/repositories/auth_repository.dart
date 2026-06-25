import '../models/user_model.dart';
import '../services/auth_api_service.dart';
import '../services/database_helper.dart';
import '../services/dio_client.dart';

class AuthRepository {
  final AuthApiService _apiService = AuthApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // Đăng nhập
  Future<UserModel> login(String email, String password) async {
    //Gọi API login
    final response = await _apiService.login(email, password);
    //Chuyển JSON thành UserModel
    final user = UserModel.fromJson(response['user']);
    // Lưu vào database local
    await _dbHelper.saveUser(user);
    return user;
  }

  // Đăng xuất
  Future<void> logout() async {
    await _apiService.logout();
    DioClient().clearCookies();
    DioClient().clearAuthToken();
    //Xóa dữ liệu local
    await _dbHelper.clearUser();
    await _dbHelper.clearConcerts();
    await _dbHelper.clearAllTickets();
  }

  // Lấy user từ local
  Future<UserModel?> getCurrentUser() async {
    return await _dbHelper.getUser();
  }

  // Kiểm tra đã đăng nhập chưa
  Future<bool> isLoggedIn() async {
    final user = await _dbHelper.getUser();
    return user != null;
  }


  Future<UserModel> updateProfile(String fullName) async {
    // Gọi API update profile
    final response = await _apiService.updateProfile(fullName);
    // Chuyển JSON thành UserModel
    final user = UserModel.fromJson(response['user']);
    // Cập nhật vào database local
    await _dbHelper.saveUser(user);
    return user;
  }


  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _apiService.changePassword(currentPassword, newPassword);
  }

}
