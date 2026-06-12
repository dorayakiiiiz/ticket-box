import '../models/concert_model.dart';
import '../services/concert_api_service.dart';
import '../services/database_helper.dart';

class ConcertRepository {
  final ConcertApiService _apiService = ConcertApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // Lấy danh sách concerts (ưu tiên cache, gọi API sau)
  Future<List<ConcertModel>> getConcerts() async {
    final cachedConcerts = await _dbHelper.getConcerts();
    try {
      final apiConcerts = await _apiService.fetchConcerts();
      await _dbHelper.saveConcerts(apiConcerts);
      return apiConcerts;
    } catch (e) {
      if (cachedConcerts.isNotEmpty) {
        return cachedConcerts;
      }
      throw Exception('Không thể tải danh sách sự kiện: $e');
    }
  }

  // Chỉ lấy cache (dùng khi mất mạng)
  Future<List<ConcertModel>> getCachedConcerts() async {
    return await _dbHelper.getConcerts();
  }

  // Refresh (chỉ gọi API, bỏ qua cache)
  Future<List<ConcertModel>> refreshConcerts() async {
    final concerts = await _apiService.fetchConcerts();
    await _dbHelper.saveConcerts(concerts);
    return concerts;
  }
}
