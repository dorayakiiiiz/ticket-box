import 'package:flutter/material.dart';
import '../repositories/concert_repository.dart';
import '../models/concert_model.dart';

class ConcertProvider extends ChangeNotifier {
  final ConcertRepository _repository = ConcertRepository();
  
  // State
  List<ConcertModel> _concerts = [];
  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _errorMessage;
  
  // Getters
  List<ConcertModel> get concerts => _concerts;
  bool get isLoading => _isLoading;
  bool get isRefreshing => _isRefreshing;
  String? get errorMessage => _errorMessage;
  
  // Lấy danh sách concerts (cache + API)
  Future<void> loadConcerts(String token, {bool refresh = false}) async {
    if (refresh) {
      _isRefreshing = true;
    } else {
      _isLoading = true;
    }
    _errorMessage = null;
    notifyListeners();
    
    try {
      if (refresh) {
        _concerts = await _repository.refreshConcerts();
      } else {
        _concerts = await _repository.getConcerts();
      }
      
      _isLoading = false;
      _isRefreshing = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _isRefreshing = false;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }
  

  Future<void> loadCachedConcerts() async {
    _concerts = await _repository.getCachedConcerts();
    notifyListeners();
  }
  
  // Xóa lỗi
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}