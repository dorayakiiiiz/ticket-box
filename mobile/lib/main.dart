import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/dio_client.dart';  // 👈 THÊM IMPORT
import 'providers/auth_provider.dart';
import 'providers/concert_provider.dart';
import 'providers/ticket_provider.dart';
import 'screens/login_screen.dart';
import 'screens/concert_selection_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 👈 KHỞI TẠO DioClient TRƯỚC KHI DÙNG
  DioClient().init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ConcertProvider()),
        ChangeNotifierProvider(create: (_) => TicketProvider()),
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

          if (authProvider.isLoggedIn) {
            return const ConcertSelectionScreen();
          }

          // Chưa đăng nhập → hiển thị màn hình login
          return const LoginScreen();
        },
      ),
    );
  }
}