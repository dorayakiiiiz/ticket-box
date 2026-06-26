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
      version: 2,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
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

    // Bảng concerts dùng để lưu cache
    await db.execute('''
      CREATE TABLE concerts(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT,
        venue TEXT,
        imageUrl TEXT
      )
    ''');

    // Bảng current_concerts
    await db.execute('''
      CREATE TABLE current_concerts(
        id TEXT PRIMARY KEY,
        concertId TEXT NOT NULL,
        concertName TEXT NOT NULL,
        updatedAt TEXT
      )
    ''');

    // Bảng tickets
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

    // Bảng guests
    await db.execute('''
      CREATE TABLE guests(
        id TEXT PRIMARY KEY,
        guestCode TEXT NOT NULL UNIQUE,
        fullName TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        isCheckedIn INTEGER DEFAULT 0,
        checkedInAt TEXT,
        synced INTEGER DEFAULT 0,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Bảng ticket_pending_queue (mới)
    await db.execute('''
      CREATE TABLE ticket_pending_queue(
        id TEXT PRIMARY KEY,
        ticketId TEXT NOT NULL,
        action TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )
    ''');

    // Bảng guest_pending_queue (mới)
    await db.execute('''
      CREATE TABLE guest_pending_queue(
        id TEXT PRIMARY KEY,
        guestId TEXT NOT NULL,
        action TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )
    ''');

    // Index cho query nhanh
    await db.execute('CREATE INDEX idx_tickets_qr ON tickets(qrCode)');
    await db.execute('CREATE INDEX idx_tickets_status ON tickets(status)');
    await db.execute('CREATE INDEX idx_guests_guestCode ON guests(guestCode)');
    await db.execute('CREATE INDEX idx_guests_email ON guests(email)');
    await db.execute('CREATE INDEX idx_guests_isCheckedIn ON guests(isCheckedIn)');
    await db.execute('CREATE INDEX idx_ticket_pending_queue_synced ON ticket_pending_queue(synced)');
    await db.execute('CREATE INDEX idx_guest_pending_queue_synced ON guest_pending_queue(synced)');
  }

  // Xử lý nâng cấp database
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Tạo bảng ticket_pending_queue
      await db.execute('''
        CREATE TABLE ticket_pending_queue(
          id TEXT PRIMARY KEY,
          ticketId TEXT NOT NULL,
          action TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        )
      ''');

      // Tạo bảng guest_pending_queue
      await db.execute('''
        CREATE TABLE guest_pending_queue(
          id TEXT PRIMARY KEY,
          guestId TEXT NOT NULL,
          action TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        )
      ''');

      // Thêm cột checkedInAt cho bảng guests nếu chưa có
      try {
        await db.execute('ALTER TABLE guests ADD COLUMN checkedInAt TEXT');
      } catch (e) {
        // Cột đã tồn tại, bỏ qua
      }

      // Tạo index
      await db.execute('CREATE INDEX idx_ticket_pending_queue_synced ON ticket_pending_queue(synced)');
      await db.execute('CREATE INDEX idx_guest_pending_queue_synced ON guest_pending_queue(synced)');
    }
  }

  // ============ USER METHODS ============

  Future<void> saveUser(UserModel user) async {
    final db = await database;
    await db.insert('users', user.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<UserModel?> getUser() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('users');
    if (maps.isNotEmpty) {
      return UserModel.fromMap(maps.first);
    }
    return null;
  }

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
    final batch = db.batch();
    for (var concert in concerts) {
      batch.insert('concerts', concert.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<List<ConcertModel>> getConcerts() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('concerts');
    return maps.map((map) => ConcertModel.fromMap(map)).toList();
  }

  // ============ CURRENT CONCERT METHODS ============

  Future<String?> getCurrentConcertId() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('current_concerts');
    if (maps.isNotEmpty) {
      return maps.first['concertId'] as String?;
    }
    return null;
  }

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
    await db.delete('current_concerts');
    await db.insert('current_concerts', {
      'id': 'current_1',
      'concertId': concertId,
      'concertName': concertName,
      'updatedAt': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> clearConcerts() async {
    final db = await database;
    await db.delete('concerts');
  }

  // ============ TICKET METHODS ============

  Future<void> saveTickets(List<TicketModel> tickets) async {
    final db = await database;
    final batch = db.batch();
    for (var ticket in tickets) {
      batch.insert('tickets', ticket.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<void> clearAllConcerts() async {
    final db = await database;
    await db.delete('concerts');
  }

  Future<void> clearAllTickets() async {
    final db = await database;
    await db.delete('tickets');
  }

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

  // Lưu 1 khách mời
  Future<void> saveGuest(GuestModel guest) async {
    final db = await database;
    await db.insert('guests', guest.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // Xóa tất cả khách mời
  Future<void> clearAllGuests() async {
    final db = await database;
    await db.delete('guests');
  }

  // Xóa 1 khách mời
  Future<void> deleteGuest(String id) async {
    final db = await database;
    await db.delete(
      'guests',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Lấy tất cả khách mời
  Future<List<GuestModel>> getAllGuests() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('guests');
    return maps.map((map) => GuestModel.fromMap(map)).toList();
  }

  // Lấy khách mời theo guestCode
  Future<GuestModel?> getGuestByCode(String guestCode) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'guestCode = ?',
      whereArgs: [guestCode],
    );
    if (maps.isNotEmpty) {
      return GuestModel.fromMap(maps.first);
    }
    return null;
  }

  // Lấy khách mời theo email
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

  // Lấy khách mời theo QR Code
  Future<GuestModel?> getGuestByQrCode(String qrCode) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'qrCode = ?',
      whereArgs: [qrCode],
    );
    if (maps.isNotEmpty) {
      return GuestModel.fromMap(maps.first);
    }
    return null;
  }

  // Cập nhật trạng thái check-in của khách mời
  Future<void> updateGuestCheckIn(String guestCode) async {
    final db = await database;
    await db.update(
      'guests',
      {
        'isCheckedIn': 1,
        'checkedInAt': DateTime.now().toIso8601String(),
        'synced': 0,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'guestCode = ?',
      whereArgs: [guestCode],
    );
  }

  // Cập nhật trạng thái check-in của khách mời theo ID
  Future<void> updateGuestCheckInById(String id, DateTime checkedInAt) async {
    final db = await database;
    await db.update(
      'guests',
      {
        'isCheckedIn': 1,
        'checkedInAt': checkedInAt.toIso8601String(),
        'synced': 0,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Lấy danh sách khách mời chưa đồng bộ
  Future<List<GuestModel>> getUnsyncedGuests() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'isCheckedIn = ? AND synced = ?',
      whereArgs: [1, 0],
    );
    return maps.map((map) => GuestModel.fromMap(map)).toList();
  }

  // Lấy danh sách khách mời đã check-in
  Future<List<GuestModel>> getCheckedInGuests() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'guests',
      where: 'isCheckedIn = ?',
      whereArgs: [1],
      orderBy: 'checkedInAt DESC',
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

  // ============ TICKET PENDING QUEUE ============

  Future<void> addTicketToPendingQueue({
    required String id,
    required String ticketId,
    required String action,
  }) async {
    final db = await database;
    await db.insert(
      'ticket_pending_queue',
      {
        'id': id,
        'ticketId': ticketId,
        'action': action,
        'createdAt': DateTime.now().toIso8601String(),
        'synced': 0,
      },
    );
  }

  Future<List<Map<String, dynamic>>> getTicketPendingQueue() async {
    final db = await database;
    return await db.query(
      'ticket_pending_queue',
      where: 'synced = 0',
      orderBy: 'createdAt ASC',
    );
  }

  Future<void> clearTicketPendingQueue(List<String> ids) async {
    if (ids.isEmpty) return;
    final db = await database;
    await db.delete(
      'ticket_pending_queue',
      where: 'id IN (${ids.map((_) => '?').join(',')})',
      whereArgs: ids,
    );
  }

  Future<void> clearAllTicketPendingQueue() async {
    final db = await database;
    await db.delete('ticket_pending_queue');
  }

  // ============ GUEST PENDING QUEUE ============

  Future<void> addGuestToPendingQueue({
    required String id,
    required String guestId,
    required String action,
  }) async {
    final db = await database;
    await db.insert(
      'guest_pending_queue',
      {
        'id': id,
        'guestId': guestId,
        'action': action,
        'createdAt': DateTime.now().toIso8601String(),
        'synced': 0,
      },
    );
  }

  Future<List<Map<String, dynamic>>> getGuestPendingQueue() async {
    final db = await database;
    return await db.query(
      'guest_pending_queue',
      where: 'synced = 0',
      orderBy: 'createdAt ASC',
    );
  }

  Future<void> clearGuestPendingQueue(List<String> ids) async {
    if (ids.isEmpty) return;
    final db = await database;
    await db.delete(
      'guest_pending_queue',
      where: 'id IN (${ids.map((_) => '?').join(',')})',
      whereArgs: ids,
    );
  }

  Future<void> clearAllGuestPendingQueue() async {
    final db = await database;
    await db.delete('guest_pending_queue');
  }

  // ============ HISTORY METHODS ============

  Future<int> getTotalTickets() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM tickets');
    return result.first['count'] as int;
  }

  Future<int> getScannedCount() async {
    final db = await database;
    final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM tickets WHERE status = ?',
        ['CHECKED_IN']
    );
    return result.first['count'] as int;
  }

  Future<List<Map<String, dynamic>>> getScannedHistory() async {
    final db = await database;
    return await db.rawQuery(
        'SELECT id, qrCode, status, checkedInAt, synced FROM tickets WHERE status = ? ORDER BY checkedInAt DESC',
        ['CHECKED_IN']
    );
  }

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
  // QUẢN LÝ SYNC QUEUE (CŨ - GIỮ ĐỂ TƯƠNG THÍCH)
  // ============================================================

  @Deprecated('Use ticket_pending_queue and guest_pending_queue instead')
  Future<List<Map<String, dynamic>>> getPendingQueue() async {
    final db = await database;
    return await db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['PENDING'],
      orderBy: 'createdAt ASC',
    );
  }

  @Deprecated('Use addTicketToPendingQueue or addGuestToPendingQueue instead')
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

  @Deprecated('Use clearTicketPendingQueue or clearGuestPendingQueue instead')
  Future<void> removeFromPendingQueue(String id) async {
    final db = await database;
    await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  @Deprecated('Use clearTicketPendingQueue or clearGuestPendingQueue instead')
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

  @Deprecated('Use ticket_pending_queue and guest_pending_queue instead')
  Future<void> updateSyncStatus(String id, String status) async {
    final db = await database;
    await db.update(
      'sync_queue',
      {'status': status},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Xóa bảng sync_queue cũ (dùng khi cần)
  Future<void> dropOldSyncQueue() async {
    final db = await database;
    await db.execute('DROP TABLE IF EXISTS sync_queue');
  }
}