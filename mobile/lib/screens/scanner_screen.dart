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
  bool _isSyncing = false;

  // Đã bắt đầu quét QR hay chưa (ban đầu chỉ hiển thị camera bình thường)
  bool _scanningStarted = false;

  // Thống kê
  int _totalTickets = 0; // Tổng số vé (dùng cho "Lịch sử")
  int _totalScanned = 0; // Số vé đã quét hôm nay


  bool _isOnline = true; // Trạng thái kết nối mạng

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

    setState(() {
      _totalTickets = totalTickets;
      _totalScanned = scanned;
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


  void _startScanning() {
    setState(() {
      _scanningStarted = true;
      _isScanning = true;
      _lastScannedCode = null;
    });
  }

  // Dừng quét, quay lại trạng thái camera bình thường
  void _stopScanning() {
    setState(() {
      _scanningStarted = false;
      _isScanning = false;
      _lastScannedCode = null;
    });
  }

  void _onQRScanned(BarcodeCapture capture) async {
    if (!_scanningStarted || !_isScanning || _isProcessing) return;

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
    // Kiểm tra nếu đang sync thì không cho chạy tiếp
    if (_isSyncing) return;

    setState(() {
      _isSyncing = true;
    });

    // Hiển thị snackbar đang đồng bộ
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang đồng bộ vé...'),
        backgroundColor: Colors.blueAccent,
        duration: Duration(seconds: 2),
      ),
    );

    try {
      final ticketProvider = Provider.of<TicketProvider>(context, listen: false);

      // Gọi sync tickets từ provider
      final success = await ticketProvider.syncTickets(widget.concertId);

      if (success && mounted) {
        // Load lại thống kê sau khi sync thành công
        await _loadStats();

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
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSyncing = false;
        });
      }
    }
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
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: _goBack,
        ),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.confirmation_number, color: Colors.white, size: 16),
                SizedBox(width: 4),
                Text(
                  'Ticket',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              widget.concertName,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 11,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Thanh trạng thái kết nối
          Container(
            width: double.infinity,
            color: const Color(0xFFE8F5E9),
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.wifi, color: Colors.green, size: 14),
                SizedBox(width: 6),
                Text(
                  'Đã kết nối - Đồng bộ tự động',
                  style: TextStyle(
                    color: Colors.green,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // ============ Hàng thống kê: Chỉ còn 2 cột ============
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStatColumn('Hôm nay', _totalTickets.toString(), Colors.black),
                _buildStatColumn('Đã quét', _totalScanned.toString(), Colors.orange),
              ],
            ),
          ),
          // ============ KẾT THÚC ============

          // Khu vực camera / placeholder
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  color: const Color(0xFFEDEDF2),
                  child: _hasPermission
                      ? Stack(
                    fit: StackFit.expand,
                    children: [
                      if (_scanningStarted)
                        MobileScanner(
                          controller: _cameraController,
                          onDetect: _onQRScanned,
                        ),
                      if (!_scanningStarted)
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.qr_code_2,
                                  size: 36,
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'Sẵn sàng quét vé',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_scanningStarted)
                        Center(child: _buildScanFrame()),
                      if (_scanningStarted)
                        Positioned(
                          top: 12,
                          right: 12,
                          child: IconButton(
                            onPressed: _stopScanning,
                            icon: const Icon(Icons.close, color: Colors.white),
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black54,
                            ),
                          ),
                        ),
                      if (_scanningStarted)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: IconButton(
                            onPressed: () {
                              setState(() {
                                _cameraController.toggleTorch();
                              });
                            },
                            icon: Icon(
                              _cameraController.torchEnabled
                                  ? Icons.flashlight_on
                                  : Icons.flashlight_off,
                              color: Colors.white,
                            ),
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black54,
                            ),
                          ),
                        ),
                      if (ticketProvider.isValidating)
                        Container(
                          color: Colors.black.withOpacity(0.7),
                          child: const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircularProgressIndicator(color: Colors.white),
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
                          size: 64,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Cần quyền truy cập camera',
                          style: TextStyle(color: Colors.black54),
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
              ),
            ),
          ),

          // Nút bắt đầu / dừng quét
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _scanningStarted ? _stopScanning : _startScanning,
                icon: Icon(_scanningStarted ? Icons.close : Icons.qr_code_scanner),
                label: Text(_scanningStarted ? 'Dừng quét' : 'Bắt đầu quét'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  textStyle: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ),

          // Tiêu đề "Thao tác nhanh"
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'THAO TÁC NHANH',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),

          // Hai thẻ thao tác nhanh: Đồng bộ | Lịch sử
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Row(
              children: [
                Expanded(
                  child: _buildQuickActionCard(
                    icon: Icons.sync,
                    label: 'Đồng bộ',
                    value: _isOnline ? 'Online' : 'Đang đồng bộ...',
                    onTap: _syncOffline,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickActionCard(
                    icon: Icons.history,
                    label: 'Lịch sử',
                    value: '$_totalTickets vé',
                    onTap: _showHistory,
                  ),
                ),
              ],
            ),
          ),

          // Thông báo lỗi nếu có
          if (ticketProvider.validationMessage != null &&
              !ticketProvider.validationSuccess)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Container(
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
            ),
        ],
      ),

      // Thanh điều hướng dưới: Quét vé | Lịch sử
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
                  active: true,
                  onTap: () {},
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.history,
                  label: 'Lịch sử',
                  active: false,
                  onTap: _showHistory,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Khung quét QR kiểu 4 góc vuông (giống Zalo)
  Widget _buildScanFrame() {
    const double size = 260;
    const double cornerLength = 32;
    const double borderWidth = 4;
    const Color frameColor = Colors.white;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            child: _buildCorner(cornerLength, borderWidth, frameColor, top: true, left: true),
          ),
          Positioned(
            top: 0,
            right: 0,
            child: _buildCorner(cornerLength, borderWidth, frameColor, top: true, left: false),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            child: _buildCorner(cornerLength, borderWidth, frameColor, top: false, left: true),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: _buildCorner(cornerLength, borderWidth, frameColor, top: false, left: false),
          ),
        ],
      ),
    );
  }

  // Một góc vuông (chữ L) của khung quét
  Widget _buildCorner(
      double length,
      double borderWidth,
      Color color, {
        required bool top,
        required bool left,
      }) {
    return Container(
      width: length,
      height: length,
      decoration: BoxDecoration(
        border: Border(
          top: top ? BorderSide(color: color, width: borderWidth) : BorderSide.none,
          bottom: !top ? BorderSide(color: color, width: borderWidth) : BorderSide.none,
          left: left ? BorderSide(color: color, width: borderWidth) : BorderSide.none,
          right: !left ? BorderSide(color: color, width: borderWidth) : BorderSide.none,
        ),
        borderRadius: BorderRadius.only(
          topLeft: top && left ? const Radius.circular(12) : Radius.zero,
          topRight: top && !left ? const Radius.circular(12) : Radius.zero,
          bottomLeft: !top && left ? const Radius.circular(12) : Radius.zero,
          bottomRight: !top && !left ? const Radius.circular(12) : Radius.zero,
        ),
      ),
    );
  }

  // Cột thống kê (nhãn nhỏ phía trên, giá trị lớn phía dưới)
  Widget _buildStatColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  // Thẻ thao tác nhanh (Đồng bộ / Lịch sử)
  Widget _buildQuickActionCard({
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: _isSyncing ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: _isSyncing ? Colors.grey[200] : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE0E0E0)),
        ),
        child: Column(
          children: [
            if (_isSyncing)
              const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.deepPurple,
                ),
              )
            else
              Icon(icon, color: Colors.deepPurple, size: 22),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              _isSyncing ? 'Đang đồng bộ...' : value,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  // Mục điều hướng dưới cùng
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

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }
}