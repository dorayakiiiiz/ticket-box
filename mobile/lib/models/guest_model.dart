class GuestModel {
  final String id;
  final String name;
  final String email;
  final String qrCode;
  final String status;
  final DateTime? checkedInAt;
  final bool synced;

  GuestModel({
    required this.id,
    required this.name,
    required this.email,
    required this.qrCode,
    required this.status,
    this.checkedInAt,
    this.synced = false,
  });

  // 1. Từ JSON (API) → Object
  factory GuestModel.fromJson(Map<String, dynamic> json) {
    return GuestModel(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      qrCode: json['qrCode'],
      status: json['status'],
      checkedInAt: json['checkedInAt'] != null 
          ? DateTime.parse(json['checkedInAt']) 
          : null,
      synced: json['synced'] ?? false,
    );
  }

  // 2. Từ Map (Database) → Object
  factory GuestModel.fromMap(Map<String, dynamic> map) {
    return GuestModel(
      id: map['id'],
      name: map['name'],
      email: map['email'],
      qrCode: map['qrCode'],
      status: map['status'],
      checkedInAt: map['checkedInAt'] != null 
          ? DateTime.parse(map['checkedInAt']) 
          : null,
      synced: map['synced'] == 1,
    );
  }

  // 3. Từ Object → Map (để lưu vào Database)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'qrCode': qrCode,
      'status': status,
      'checkedInAt': checkedInAt?.toIso8601String(),
      'synced': synced ? 1 : 0,
    };
  }
}