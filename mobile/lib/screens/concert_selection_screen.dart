import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/concert_provider.dart';
import '../providers/ticket_provider.dart';
import '../providers/auth_provider.dart';
import 'scanner_screen.dart';

class ConcertSelectionScreen extends StatefulWidget {
  const ConcertSelectionScreen({super.key});

  @override
  State<ConcertSelectionScreen> createState() => _ConcertSelectionScreenState();
}

class _ConcertSelectionScreenState extends State<ConcertSelectionScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final concertProvider = Provider.of<ConcertProvider>(context, listen: false);

    await concertProvider.loadConcerts("abcd");

    /*
    if (authProvider.currentUser != null) {
      await concertProvider.loadConcerts(authProvider.currentUser!.token);
    }
     */
  }

  void _syncOffline(String concertId, String concertName) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final ticketProvider = Provider.of<TicketProvider>(context, listen: false);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang đồng bộ vé...'),
        backgroundColor: Colors.blueAccent,
        duration: Duration(seconds: 2),
      ),
    );
    //tạo thời comment để chạy local
    //if (authProvider.currentUser == null) return;

    final success = await ticketProvider.syncTickets(concertId);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đồng bộ thành công! Dữ liệu đã sẵn sàng để soát vé offline.'),
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

  Future<void> _refreshConcerts() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final concertProvider = Provider.of<ConcertProvider>(context, listen: false);

    if (authProvider.currentUser != null) {
      await concertProvider.loadConcerts(authProvider.currentUser!.token, refresh: true);
    }
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
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ConcertLoadingScreen(
              concertId: concertId,
              concertName: concert.name,
            ),
          ),
        );
      },
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
                  // Nút Đồng bộ Offline
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

            // Chevron
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Colors.black38, size: 22),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────

class ConcertLoadingScreen extends StatefulWidget {
  final String concertId;
  final String concertName;

  const ConcertLoadingScreen({
    super.key,
    required this.concertId,
    required this.concertName,
  });

  @override
  State<ConcertLoadingScreen> createState() => _ConcertLoadingScreenState();
}

class _ConcertLoadingScreenState extends State<ConcertLoadingScreen> {
  double _progress = 0.0;
  final List<String> _completedSteps = [];

  static const _steps = [
    'Kết nối máy chủ',
    'Xác thực phiên làm việc',
    'Tải danh sách vé',
    'Chuẩn bị máy quét',
  ];

  @override
  void initState() {
    super.initState();
    _runLoadingSequence();
  }

  Future<void> _runLoadingSequence() async {
    final startTime = DateTime.now();
    const totalDuration = Duration(seconds: 3);

    while (true) {
      final elapsed = DateTime.now().difference(startTime);
      final progress = (elapsed.inMilliseconds / totalDuration.inMilliseconds)
          .clamp(0.0, 1.0);

      if (!mounted) return;
      setState(() {
        _progress = progress;

        final stepIndex = (progress * _steps.length).floor();
        for (int i = _completedSteps.length; i <= stepIndex && i < _steps.length; i++) {
          if (!_completedSteps.contains(_steps[i])) {
            _completedSteps.add(_steps[i]);
          }
        }
      });

      if (progress >= 1.0) break;
      await Future.delayed(const Duration(milliseconds: 16));
    }

    setState(() {
      for (final step in _steps) {
        if (!_completedSteps.contains(step)) {
          _completedSteps.add(step);
        }
      }
    });

    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ScannerScreen(
          concertId: widget.concertId,
          concertName: widget.concertName,
        ),
      ),
    );

  }

  @override
  Widget build(BuildContext context) {
    final percent = (_progress * 100).round();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE0E0E0), height: 1),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 60),

            // Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F0F0),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.storage_rounded,
                size: 42,
                color: Color(0xFF9E9E9E),
              ),
            ),

            const SizedBox(height: 24),

            // Title
            const Text(
              'ĐANG TẢI DỮ LIỆU...',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Colors.black87,
                letterSpacing: 0.5,
              ),
            ),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              'Đang tải danh sách vé của ${widget.concertName}',
              style: const TextStyle(fontSize: 13, color: Colors.black45),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 36),

            // Progress label row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tiến độ',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.black54,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  '$percent%',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Colors.black54,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _progress,
                minHeight: 6,
                backgroundColor: const Color(0xFFEEEEEE),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF212121)),
              ),
            ),

            const SizedBox(height: 28),

            // Completed steps
            Column(
              children: _completedSteps.map((step) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Color(0xFF4CAF50),
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        step,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}