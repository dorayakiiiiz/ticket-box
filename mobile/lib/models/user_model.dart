class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role;

  //Dùng required để bắt buộc phải có các tham số lúc khởi tạo
  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.role = 'STAFF',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      fullName: json['fullName'],
      role: json['role'] ?? 'STAFF',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'role': role,
    };
  }

  // 👇 THÊM HÀM NÀY để đọc từ SQLite
  // Từ Map (database) → Object
  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'],
      email: map['email'],
      fullName: map['fullName'],
      role: map['role'] ?? 'STAFF',
    );
  }
}
