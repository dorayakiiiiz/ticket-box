import '../models/concert_model.dart';
import '../services/concert_api_service.dart';
import '../services/database_helper.dart';

class ConcertRepository {
  final ConcertApiService _apiService = ConcertApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // Lấy danh sách concerts
  Future<List<ConcertModel>> getConcerts() async {
    final cachedConcerts = await _dbHelper.getConcerts();
    try {
      final apiConcerts = await _apiService.fetchConcerts();
      await _dbHelper.clearAllConcerts();
      await _dbHelper.saveConcerts(apiConcerts); //cập nhật cache mới phòng khi mất mạng có thể sử dụng
      return apiConcerts;
    } catch (e) {
      if (cachedConcerts.isNotEmpty) {
        return cachedConcerts; //Nếu gọi API thất bại thì hiển thị danh sách đã save
      }
      throw Exception('Không thể tải danh sách sự kiện: $e');
    }
  }

  // Chỉ lấy cache (dùng khi không có mạng)
  Future<List<ConcertModel>> getCachedConcerts() async {
    return await _dbHelper.getConcerts();
  }

}
