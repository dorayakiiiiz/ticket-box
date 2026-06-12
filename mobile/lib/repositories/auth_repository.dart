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
    
    //Chuyển JSON → UserModel
    final user = UserModel.fromJson(response['user']);

    //Lưu token vào private dio
    DioClient().setAuthToken(user.token);
    
    //Lưu vào database local
    await _dbHelper.saveUser(user);
    
    return user;
  }

  // Đăng xuất
  Future<void> logout() async {
    //Lấy user hiện tại (để có token)
    final user = await _dbHelper.getUser();
    
    //Gọi API logout (nếu có token)
    if (user != null) {
      await _apiService.logout(user.token);
    }

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
}