import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../providers/ticket_provider.dart';
import '../services/database_helper.dart';
import 'history_screen.dart';
import 'concert_selection_screen.dart';

class ScannerScreen extends StatefulWidget {
  final String concertId;
  final String concertName;

  const ScannerScreen({
    super.key,
    required this.concertId,
    required this.concertName,
  });

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _cameraController = MobileScannerController(
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _isScanning = true;
  bool _hasPermission = false;
  String? _lastScannedCode;
  bool _isProcessing = false;

  // Thống kê
  int _totalTickets = 0;      // Tổng số vé
  int _totalScanned = 0;       // Số vé đã quét
  int _totalUnsynced = 0;      // Số vé chưa đồng bộ

  final DatabaseHelper _dbHelper = DatabaseHelper();

  @override
  void initState() {
    super.initState();
    _checkPermission();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final totalTickets = await _dbHelper.getTotalTickets();
    final scanned = await _dbHelper.getScannedCount();
    final unsynced = await _dbHelper.getUnsyncedCount();

    setState(() {
      _totalTickets = totalTickets;
      _totalScanned = scanned;
      _totalUnsynced = unsynced;
    });
  }

  Future<void> _checkPermission() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      setState(() {
        _hasPermission = true;
      });
    } else {
      setState(() {
        _hasPermission = false;
      });
    }
  }

  void _onQRScanned(BarcodeCapture capture) async {
    if (!_isScanning || _isProcessing) return;

    final String? qrCode = capture.barcodes.first.rawValue;
    if (qrCode == null || qrCode == _lastScannedCode) return;

    _lastScannedCode = qrCode;
    _isProcessing = true;

    // Tạm dừng quét
    _isScanning = false;

    // Gọi provider để validate
    final ticketProvider = Provider.of<TicketProvider>(context, listen: false);
    final result = await ticketProvider.validateTicket(qrCode);

    if (!mounted) return;

    // Cập nhật thống kê nếu thành công
    if (result['success']) {
      // Load lại stats ngay sau khi quét thành công
      await _loadStats();
    }

    // Hiển thị kết quả
    _showResultDialog(result['success'], result['message']);

    // Reset sau 2 giây
    await Future.delayed(const Duration(seconds: 2));
    _lastScannedCode = null;
    _isScanning = true;
    _isProcessing = false;
  }

  void _showResultDialog(bool success, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: success ? Colors.green : Colors.red,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              success ? Icons.check_circle : Icons.cancel,
              size: 60,
              color: Colors.white,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );

    // Tự đóng sau 2 giây
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) Navigator.pop(context);
    });
  }

  Future<void> _syncOffline() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang đồng bộ...'),
        backgroundColor: Colors.blue,
      ),
    );

    // TODO: Gọi API sync tickets lên server
    await Future.delayed(const Duration(seconds: 2));

    // Cập nhật lại thống kê
    await _loadStats();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đồng bộ thành công!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showHistory() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const HistoryScreen()),
    );
  }

  void _goBack() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ConcertSelectionScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ticketProvider = Provider.of<TicketProvider>(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(
          widget.concertName,
          style: const TextStyle(color: Colors.white),
          overflow: TextOverflow.ellipsis,
        ),
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _goBack,
        ),
        actions: [
          IconButton(
            icon: Icon(
              _cameraController.torchEnabled
                  ? Icons.flashlight_on
                  : Icons.flashlight_off,
            ),
            onPressed: () {
              setState(() {
                _cameraController.toggleTorch();
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Camera view
          Expanded(
            flex: 3,
            child: _hasPermission
                ? Stack(
              children: [
                MobileScanner(
                  controller: _cameraController,
                  onDetect: _onQRScanned,
                ),
                // Khung quét
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.white,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  margin: const EdgeInsets.all(40),
                ),
                // Loading overlay khi đang xử lý
                if (ticketProvider.isValidating)
                  Container(
                    color: Colors.black.withOpacity(0.7),
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(
                            color: Colors.white,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Đang xác thực vé...',
                            style: TextStyle(color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            )
                : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.camera_alt,
                    size: 80,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Cần quyền truy cập camera',
                    style: TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _checkPermission,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepPurpleAccent,
                    ),
                    child: const Text('Cấp quyền camera'),
                  ),
                ],
              ),
            ),
          ),

          // Thông tin bên dưới
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // 3 ô thống kê: Tổng vé | Đã quét | Chưa sync
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildStatCard('Tổng vé', _totalTickets.toString(), Colors.purple),
                    _buildStatCard('Đã quét', _totalScanned.toString(), Colors.blue),
                    _buildStatCard('Chưa sync', _totalUnsynced.toString(), Colors.orange),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _showHistory,
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.grey),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Lịch sử'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Thông báo lỗi nếu có
                if (ticketProvider.validationMessage != null &&
                    !ticketProvider.validationSuccess)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            ticketProvider.validationMessage!,
                            style: const TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Container(
      width: 100,
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }
}