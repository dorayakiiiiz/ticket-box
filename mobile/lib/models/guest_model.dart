class GuestModel {
  final String id;
  final String guestCode;
  final String fullName;
  final String email;
  final String phone;
  final bool isCheckedIn;
  final bool synced;

  GuestModel({
    required this.id,
    required this.guestCode,
    required this.fullName,
    required this.email,
    this.phone = '',
    this.isCheckedIn = false,
    this.synced = false,
  });

  // 1. Từ JSON (API) → Object
  factory GuestModel.fromJson(Map<String, dynamic> json) {
    return GuestModel(
      id: json['id'] ?? '',
      guestCode: json['guestCode'] ?? '',
      fullName: json['fullName'] ?? json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      isCheckedIn: json['isCheckedIn'] ?? json['checkedIn'] ?? false,
      synced: json['synced'] ?? false,
    );
  }

  // 2. Từ Map (Database) → Object
  factory GuestModel.fromMap(Map<String, dynamic> map) {
    return GuestModel(
      id: map['id'] ?? '',
      guestCode: map['guestCode'] ?? '',
      fullName: map['fullName'] ?? map['name'] ?? '',
      email: map['email'] ?? '',
      phone: map['phone'] ?? '',
      isCheckedIn: map['isCheckedIn'] == 1 || map['isCheckedIn'] == true,
      synced: map['synced'] == 1 || map['synced'] == true,
    );
  }

  // 3. Từ Object → Map (để lưu vào Database)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'guestCode': guestCode,
      'fullName': fullName,
      'email': email,
      'phone': phone,
      'isCheckedIn': isCheckedIn ? 1 : 0,
      'synced': synced ? 1 : 0,
    };
  }

  // Copy với các field mới
  GuestModel copyWith({
    String? id,
    String? guestCode,
    String? fullName,
    String? email,
    String? phone,
    String? qrCode,
    bool? isCheckedIn,
    bool? synced,
  }) {
    return GuestModel(
      id: id ?? this.id,
      guestCode: guestCode ?? this.guestCode,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      isCheckedIn: isCheckedIn ?? this.isCheckedIn,
      synced: synced ?? this.synced,
    );
  }
}