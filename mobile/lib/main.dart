import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/dio_client.dart';
import 'providers/auth_provider.dart';
import 'providers/concert_provider.dart';
import 'providers/ticket_provider.dart';
import 'screens/login_screen.dart';
import 'screens/concert_selection_screen.dart';
import 'utils/network_sync_service.dart';
import 'services/database_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Khởi tạo Dio
  DioClient().init();

  // Chỉ reset khi cần (bỏ comment nếu muốn xóa dữ liệu cũ)
  await DatabaseHelper().resetDatabase();

  // Khởi tạo database
  await DatabaseHelper().database;
  print('Database initialized');

  final dbHelper = DatabaseHelper();
  final currentConcertId = await dbHelper.getCurrentConcertId();

  // Khởi tạo background sync với concertId (nếu có)
  final syncService = NetworkSyncService();
  if (currentConcertId != null && currentConcertId.isNotEmpty) {
    syncService.startBackgroundSync(concertId: currentConcertId);
    print('  started with concertId: $currentConcertId');
  } else {
    // Khởi động nhưng chưa có concertId, sẽ cập nhật sau
    syncService.startBackgroundSync();
    print('NetworkSyncService started without concertId (will update later)');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ConcertProvider()),
        ChangeNotifierProvider(create: (_) => TicketProvider()),
        // Provider cho NetworkSyncService
        Provider<NetworkSyncService>.value(value: syncService),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TicketBox Staff',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D0C14),
        primaryColor: Colors.deepPurpleAccent,
        colorScheme: const ColorScheme.dark(
          primary: Colors.deepPurpleAccent,
          secondary: Colors.blueAccent,
          background: Color(0xFF0D0C14),
          surface: Color(0xFF1E1B29),
          error: Colors.redAccent,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold, color: Colors.white),
          titleLarge: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: Colors.white),
          bodyLarge: TextStyle(fontFamily: 'Inter', color: Colors.white70),
          bodyMedium: TextStyle(fontFamily: 'Inter', color: Colors.white60),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E1B29),
          elevation: 0,
          titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: Colors.white,
          ),
          iconTheme: IconThemeData(color: Colors.white),
        ),
        useMaterial3: true,
      ),
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            authProvider.init();
          });
          return const LoginScreen();
        },
      ),
    );
  }
}