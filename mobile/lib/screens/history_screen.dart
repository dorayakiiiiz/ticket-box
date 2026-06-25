import 'package:flutter/material.dart';
import '../services/database_helper.dart';
import 'scanner_screen.dart';
import 'settings_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  List<Map<String, dynamic>> _allHistory = [];
  bool _isLoading = true;

  // Biến lưu số liệu thống kê
  int _totalTickets = 0;
  int _scannedTickets = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    // Lấy dữ liệu song song
    final results = await Future.wait([
      _dbHelper.getScannedHistory(),
      _dbHelper.getTotalTickets(),
      _dbHelper.getScannedCount(),
    ]);

    setState(() {
      _allHistory = results[0] as List<Map<String, dynamic>>;
      _totalTickets = results[1] as int;
      _scannedTickets = results[2] as int;
      _isLoading = false;
    });
  }

  String _formatTime(String? isoString) {
    if (isoString == null) return '--:--';
    final date = DateTime.parse(isoString);
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  // ✅ Hàm điều hướng đến ScannerScreen
  void _navigateToScanner() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ScannerScreen()),
    );
  }

  // ✅ Hàm điều hướng đến SettingsScreen
  void _navigateToSettings() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Colors.black87),
        title: const Text(
          'LỊCH SỬ QUÉT',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.black87,
            letterSpacing: 0.5,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black87),
            onPressed: () => Navigator.pop(context),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE0E0E0), height: 1),
        ),
      ),
      body: Column(
        children: [
          // ── Connectivity banner ──────────────────────────────
          Container(
            width: double.infinity,
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.wifi, size: 16, color: Color(0xFF4CAF50)),
                const SizedBox(width: 6),
                Text(
                  'Đã kết nối · Đồng bộ tự động',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE0E0E0)),

          // ── Stats row ────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _StatChip(
                  count: _totalTickets,
                  label: 'Tổng vé',
                  color: const Color(0xFF212121),
                ),
                const SizedBox(width: 40),
                _StatChip(
                  count: _scannedTickets,
                  label: 'Đã quét',
                  color: const Color(0xFF4CAF50),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE0E0E0)),

          // ── List ─────────────────────────────────────────────
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _allHistory.isEmpty
                ? _EmptyState()
                : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView.separated(
                padding: const EdgeInsets.only(top: 4, bottom: 16),
                itemCount: _allHistory.length,
                separatorBuilder: (_, __) =>
                const Divider(height: 1, color: Color(0xFFEEEEEE)),
                itemBuilder: (context, index) {
                  final item = _allHistory[index];
                  return _TicketTile(
                    item: item,
                    time: _formatTime(item['checkedInAt']),
                  );
                },
              ),
            ),
          ),
        ],
      ),
      // ✅ BottomNavigationBar
      bottomNavigationBar: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE0E0E0), width: 0.5)),
          ),
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: _buildNavItem(
                  icon: Icons.qr_code_scanner,
                  label: 'Quét vé',
                  active: false,
                  onTap: _navigateToScanner,
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.history,
                  label: 'Lịch sử',
                  active: true,
                  onTap: () {},
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.settings,
                  label: 'Cài đặt',
                  active: false,
                  onTap: _navigateToSettings,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ✅ Widget điều hướng bottom nav
  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    final Color color = active ? Colors.deepPurple : Colors.grey;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: active ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Stat chip
// ─────────────────────────────────────────────────────────────
class _StatChip extends StatelessWidget {
  final int count;
  final String label;
  final Color color;
  const _StatChip({required this.count, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.black54),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Ticket tile - Chỉ hiển thị ID
// ─────────────────────────────────────────────────────────────
class _TicketTile extends StatelessWidget {
  final Map<String, dynamic> item;
  final String time;

  const _TicketTile({
    required this.item,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    final qrCode = item['qrCode']?.toString() ?? item['id']?.toString() ?? '—';

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left icon
          const Icon(Icons.qr_code, color: Color(0xFF4CAF50), size: 22),
          const SizedBox(width: 12),

          // Middle content - Chỉ hiển thị ID
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  qrCode,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đã quét',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),

          // Right: time
          Text(
            time,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.qr_code_scanner, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text(
            'Chưa có vé đã quét',
            style: TextStyle(fontSize: 15, color: Colors.black45),
          ),
          const SizedBox(height: 6),
          const Text(
            'Quét vé để xem lịch sử tại đây',
            style: TextStyle(fontSize: 12, color: Colors.black38),
          ),
        ],
      ),
    );
  }
}