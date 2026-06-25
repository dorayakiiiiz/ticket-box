import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/concert_provider.dart';
import '../providers/ticket_provider.dart';
import '../providers/auth_provider.dart';
import '../services/database_helper.dart';
import 'scanner_screen.dart';

class ConcertSelectionScreen extends StatefulWidget {
  const ConcertSelectionScreen({super.key});

  @override
  State<ConcertSelectionScreen> createState() => _ConcertSelectionScreenState();
}

class _ConcertSelectionScreenState extends State<ConcertSelectionScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final concertProvider = Provider.of<ConcertProvider>(context, listen: false);
    await concertProvider.loadConcerts(refresh: false);
  }

  // ✅ Hàm đồng bộ offline - Cập nhật concert vào database
  void _syncOffline(String concertId, String concertName) async {
    final ticketProvider = Provider.of<TicketProvider>(context, listen: false);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang đồng bộ vé...'),
        backgroundColor: Colors.blueAccent,
        duration: Duration(seconds: 2),
      ),
    );

    final success = await ticketProvider.syncTickets(concertId);

    if (success && mounted) {
      // CẬP NHẬT concert vào bảng current_concerts
      await _dbHelper.saveCurrentConcert(concertId, concertName);

      print('    Đã lưu concert vào current_concerts:');
      print('   - ID: $concertId');
      print('   - Name: $concertName');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đồng bộ thành công! Đã cập nhật sự kiện.'),
          backgroundColor: Colors.green,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ticketProvider.syncError ?? 'Đồng bộ thất bại'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // ✅ Hàm chọn concert - lưu và chuyển đến Scanner
  Future<void> _selectConcert(String concertId, String concertName) async {
    // Lưu concert vào database
    await _dbHelper.saveCurrentConcert(concertId, concertName);

    // Chuyển đến ScannerScreen
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => const ScannerScreen(),
      ),
    );
  }

  Future<void> _refreshConcerts() async {
    final concertProvider = Provider.of<ConcertProvider>(context, listen: false);
    await concertProvider.loadConcerts(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final concertProvider = Provider.of<ConcertProvider>(context);
    final concerts = concertProvider.concerts;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text(
          'CHỌN SỰ KIỆN',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
            fontSize: 16,
            color: Colors.black87,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE0E0E0), height: 1),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black54),
            onPressed: concertProvider.isRefreshing ? null : _refreshConcerts,
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 20, 16, 4),
            child: Text(
              'CA LÀM VIỆC HÔM NAY',
              style: TextStyle(
                color: Colors.black87,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'Chọn sự kiện bạn đang phụ trách',
              style: TextStyle(color: Colors.black45, fontSize: 13),
            ),
          ),
          Expanded(
            child: concertProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : concertProvider.errorMessage != null && concerts.isEmpty
                ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    concertProvider.errorMessage!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _refreshConcerts,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            )
                : concerts.isEmpty
                ? const Center(
              child: Text(
                'Không tìm thấy sự kiện nào.',
                style: TextStyle(color: Colors.black38),
              ),
            )
                : RefreshIndicator(
              onRefresh: _refreshConcerts,
              child: ListView.separated(
                padding: EdgeInsets.zero,
                itemCount: concerts.length,
                separatorBuilder: (_, __) =>
                const Divider(height: 1, color: Color(0xFFE0E0E0)),
                itemBuilder: (context, index) {
                  final concert = concerts[index];
                  return _buildConcertRow(concert);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConcertRow(concert) {
    final concertId = concert.id;
    return InkWell(
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 72,
                height: 72,
                color: const Color(0xFF2A1A4E),
                child: const Icon(
                  Icons.music_note_rounded,
                  color: Colors.deepPurpleAccent,
                  size: 32,
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    concert.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 13,
                        color: Colors.black45,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        concert.formattedDateTime,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 13,
                        color: Colors.black45,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          concert.venue,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.black54,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: SizedBox(
                      height: 28,
                      child: OutlinedButton(
                        onPressed: () => _syncOffline(concertId, concert.name),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF9E9E9E), width: 1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.download_outlined,
                              size: 14,
                              color: Color(0xFF4CAF50),
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Đồng bộ Offline',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF4CAF50),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Colors.black38, size: 22),
          ],
        ),
      ),
    );
  }
}
