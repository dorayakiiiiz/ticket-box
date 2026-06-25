import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/user_model.dart';
import '../models/concert_model.dart';
import '../models/ticket_model.dart';
import '../models/guest_model.dart';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'ticketbox.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  // Tạo các bảng khi database được tạo lần đầu
  Future<void> _onCreate(Database db, int version) async {

    // Bảng lưu thông tin của nhân viên đăng nhập
    await db.execute('''
      CREATE TABLE users(
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        fullName TEXT NOT NULL,
        role TEXT DEFAULT 'STAFF'
      )
    ''');

    // Bảng concerts dùng để lưu cache cho trường hợp không thể load danh sách
    await db.execute('''
      CREATE TABLE concerts(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT,
        venue TEXT,
        imageUrl TEXT
      )
    ''');

    // SỬA: Bảng current_concerts - Thêm concertId và concertName
    await db.execute('''
      CREATE TABLE current_concerts(
        id TEXT PRIMARY KEY,
        concertId TEXT NOT NULL,
        concertName TEXT NOT NULL,
        updatedAt TEXT
      )
    ''');

    // SỬA: Bảng tickets - Thêm cột updatedAt
    await db.execute('''
      CREATE TABLE tickets(
        id TEXT PRIMARY KEY,
        qrCode TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        checkedInAt TEXT,
        synced INTEGER DEFAULT 0,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Bảng guests - Thêm cột updatedAt
    await db.execute('''
      CREATE TABLE guests(
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        status TEXT NOT NULL,
        checkedInAt TEXT,
        synced INTEGER DEFAULT 0,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Bảng sync_queue - Lưu hàng đợi chờ đồng bộ
    await db.execute('''
      CREATE TABLE sync_queue(
        id TEXT PRIMARY KEY,
        ticketId TEXT NOT NULL,
        type TEXT NOT NULL,              -- 'TICKET' hoặc 'GUEST'
        action TEXT NOT NULL,            -- 'CHECK_IN' hoặc 'UPDATE'
        status TEXT NOT NULL DEFAULT 'PENDING',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Index cho query nhanh
    await db.execute('CREATE INDEX idx_tickets_qr ON tickets(qrCode)');
    await db.execute('CREATE INDEX idx_tickets_status ON tickets(status)');
    await db.execute('CREATE INDEX idx_guests_email ON guests(email)');
    await db.execute('CREATE INDEX idx_guests_status ON guests(status)');
    await db.execute('CREATE INDEX idx_sync_queue_status ON sync_queue(status)');
    await db.execute('CREATE INDEX idx_sync_queue_ticketId ON sync_queue(ticketId)');
  }

  // ============ USER METHODS ============

  //Lưu thông tin nhân viên đang đăng nhập vào ứng dụng
  Future<void> saveUser(UserModel user) async {
    final db = await database;
    await db.insert('users', user.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  //Lấy thông tin nhân viên đang đăng nhập
  Future<UserModel?> getUser() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('users');
    if (maps.isNotEmpty) {
      return UserModel.fromMap(maps.first);
    }
    return null;
  }

  //Xóa bảng dữ liệu users (dùng khi logout)
  Future<void> clearUser() async {
    final db = await database;
    await db.delete('users');
  }


  Future<void> resetDatabase() async {
    String path = join(await getDatabasesPath(), 'ticketbox.db');
    await deleteDatabase(path);
    print('Database deleted');
  }

  // ============ CONCERT METHODS ============


  Future<void> saveConcerts(List<ConcertModel> concerts) async {
    final db = await database;
    final batch = db.batch(); //insert dữ liệu bằng batch
    for (var concert in concerts) {
      batch.insert('concerts', concert.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true); //không cần trả về kết quả
  }

  //Lấy danh sách sự kiện từ database
  Future<List<ConcertModel>> getConcerts() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('concerts');
    return maps.map((map) => ConcertModel.fromMap(map)).toList();
  }


  // ============ CURRENT CONCERT METHODS ============

  /// Lấy ID của sự kiện đang được chọn
  Future<String?> getCurrentConcertId() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('current_concerts');
    if (maps.isNotEmpty) {
      return maps.first['concertId'] as String?;
    }
    return null;
  }

  /// Lấy tên của sự kiện đang được chọn
  Future<String?> getCurrentConcertName() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('current_concerts');
    if (maps.isNotEmpty) {
      return maps.first['concertName'] as String?;
    }
    return null;
  }


  Future<void> saveCurrentConcert(String concertId, String concertName) async {
    final db = await database;

    // Xóa dữ liệu cũ (chỉ giữ 1 record)
    await db.delete('current_concerts');
    // Chèn dữ liệu mới
    await db.insert('current_concerts', {
      'id': 'current_1', // Chỉ có 1 record duy nhất
      'concertId': concertId,
      'concertName': concertName,
      'updatedAt': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  //Xóa bảng concert
  Future<void> clearConcerts() async {
    final db = await database;
    await db.delete('concerts');
  }


  // ============ TICKET METHODS ============


  // Lưu danh sách vé vào data của máy
  Future<void> saveTickets(List<TicketModel> tickets) async {
    final db = await database;
    final batch = db.batch();
    for (var ticket in tickets) {
      batch.insert('tickets', ticket.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }


  // Xóa tất cả các concert hiện có trong cache
  Future<void> clearAllConcerts() async {
    final db = await database;
    await db.delete('concerts');
  }

  // Xóa tất cả vé hiện có trong cache
  Future<void> clearAllTickets() async {
    final db = await database;
    await db.delete('tickets');
  }

  // Lấy vé theo QR code
  Future<TicketModel?> getTicketByQr(String qrCode) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tickets',
      where: 'qrCode = ?',
      whereArgs: [qrCode],
    );
    if (maps.isNotEmpty) {
      return TicketModel.fromMap(maps.first);
    }
    return null;
  }

  // Cập nhật trạng thái vé sau khi check-in
  Future<void> updateTicketStatus(String ticketId, DateTime checkedInAt) async {
    final db = await database;
    await db.update(
      'tickets',
      {
        'status': 'CHECKED_IN',
        'checkedInAt': checkedInAt.toIso8601String(),
        'synced': 0,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [ticketId],
    );
  }

  // Cập nhật trạng thái vé từ Server (dùng trong background sync)
  Future<void> updateTicketFromServer(Map<String, dynamic> serverTicket) async {
    final db = await database;
    await db.update(
      'tickets',
      {
        'status': serverTicket['status'],
        'checkedInAt': serverTicket['checkedInAt'],
        'synced': 1,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'qrCode = ?',
      whereArgs: [serverTicket['qrCode']],
    );
  }

  // Lấy danh sách vé chưa đồng bộ
  Future<List<TicketModel>> getUnsyncedTickets() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tickets',
      where: 'status = ? AND synced = ?',
      whereArgs: ['CHECKED_IN', 0],
    );
    return maps.map((map) => TicketModel.fromMap(map)).toList();
  }

  Future<List<TicketModel>> getSyncedTickets() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tickets',
      where: 'synced = ?',
      whereArgs: [1],
      orderBy: 'checkedInAt DESC',
    );
    return maps.map((map) => TicketModel.fromMap(map)).toList();
  }

  // Đánh dấu vé đã đồng bộ lên server
  Future<void> markTicketsAsSynced(List<String> ticketIds) async {
    final db = await database;
    final batch = db.batch();
    for (var id in ticketIds) {
      batch.update(
        'tickets',
        {'synced': 1},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
    await batch.commit(noResult: true);
  }

  // ============ GUEST METHODS ============
  // Lưu danh sách khách mời (batch insert)
  Future<void> saveGuests(List<GuestModel> guests) async {
    final db = await database;
    final batch = db.batch();
    for (var guest in guests) {
      batch.insert('guests', guest.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  // Xóa tất cả khách mời
  Future<void> clearAllGuests() async {
    final db = await database;
    await db.delete('guests');
  }

  // Lấy khách mời theo email (khi quét QR là email)
  Future<GuestModel?> getGuestByEmail(String email) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'email = ?',
      whereArgs: [email],
    );
    if (maps.isNotEmpty) {
      return GuestModel.fromMap(maps.first);
    }
    return null;
  }

  // Cập nhật trạng thái khách mời sau khi check-in
  Future<void> updateGuestStatus(String email, DateTime checkedInAt) async {
    final db = await database;
    await db.update(
      'guests',
      {
        'status': 'CHECKED_IN',
        'checkedInAt': checkedInAt.toIso8601String(),
        'synced': 0,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'email = ?',
      whereArgs: [email],
    );
  }

  // Lấy danh sách khách mời chưa đồng bộ
  Future<List<GuestModel>> getUnsyncedGuests() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'status = ? AND synced = ?',
      whereArgs: ['CHECKED_IN', 0],
    );
    return maps.map((map) => GuestModel.fromMap(map)).toList();
  }

  // Đánh dấu khách mời đã đồng bộ
  Future<void> markGuestsAsSynced(List<String> guestIds) async {
    final db = await database;
    final batch = db.batch();
    for (var id in guestIds) {
      batch.update(
        'guests',
        {'synced': 1},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
    await batch.commit(noResult: true);
  }

  // ============ HISTORY METHODS ============

  // Đếm tổng số vé của concert hiện tại
  Future<int> getTotalTickets() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM tickets');
    return result.first['count'] as int;
  }

  // Đếm tổng số vé đã quét
  Future<int> getScannedCount() async {
    final db = await database;
    final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM tickets WHERE status = ?',
        ['CHECKED_IN']
    );
    return result.first['count'] as int;
  }

  // Lấy danh sách vé đã quét
  Future<List<Map<String, dynamic>>> getScannedHistory() async {
    final db = await database;
    return await db.rawQuery(
        'SELECT id, qrCode, status, checkedInAt, synced FROM tickets WHERE status = ? ORDER BY checkedInAt DESC',
        ['CHECKED_IN']
    );
  }

  // Lấy chi tiết 1 vé
  Future<Map<String, dynamic>?> getTicketDetail(String id) async {
    final db = await database;
    final result = await db.query(
      'tickets',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (result.isNotEmpty) {
      return result.first;
    }
    return null;
  }


  Future<void> cleanOldHistory() async {
    final db = await database;
    final sevenDaysAgo = DateTime.now().subtract(const Duration(days: 7));
    await db.delete(
      'tickets',
      where: 'status = ? AND checkedInAt < ?',
      whereArgs: ['CHECKED_IN', sevenDaysAgo.toIso8601String()],
    );
  }

  // ============================================================
  // QUẢN LÝ SYNC QUEUE
  // ============================================================

  /// Lấy tất cả pending tickets
  Future<List<Map<String, dynamic>>> getPendingQueue() async {
    final db = await database;
    return await db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['PENDING'],
      orderBy: 'createdAt ASC',
    );
  }

  /// Thêm vào hàng đợi
  Future<void> addToPendingQueue({
    required String id,
    required String ticketId,
    required String type,
    required String action,
  }) async {
    final db = await database;
    await db.insert('sync_queue', {
      'id': id,
      'ticketId': ticketId,
      'type': type,
      'action': action,
      'status': 'PENDING',
    });
  }

  /// Xóa khỏi hàng đợi
  Future<void> removeFromPendingQueue(String id) async {
    final db = await database;
    await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Xóa nhiều khỏi hàng đợi
  Future<void> clearPendingQueue(List<String> ids) async {
    final db = await database;
    final batch = db.batch();
    for (var id in ids) {
      batch.delete(
        'sync_queue',
        where: 'id = ?',
        whereArgs: [id],
      );
    }
    await batch.commit(noResult: true);
  }

  /// Cập nhật trạng thái sync_queue
  Future<void> updateSyncStatus(String id, String status) async {
    final db = await database;
    await db.update(
      'sync_queue',
      {'status': status},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}