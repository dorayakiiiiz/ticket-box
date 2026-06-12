import 'package:flutter/material.dart';
import '../repositories/auth_repository.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository _repository = AuthRepository();
  
  // State
  bool _isLoading = false;
  String? _errorMessage;
  UserModel? _currentUser;
  
  // Getters
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  UserModel? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;
  
  // Khởi tạo: kiểm tra đã đăng nhập chưa
  Future<void> init() async {
    _currentUser = await _repository.getCurrentUser();
    notifyListeners();
  }
  
  // Đăng nhập
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    
    try {
      _currentUser = await _repository.login(email, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }
  
  // Đăng xuất
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();
    
    await _repository.logout();
    
    _currentUser = null;
    _isLoading = false;
    notifyListeners();
  }
  
  // Xóa lỗi
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}