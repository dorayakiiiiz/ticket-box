class UserModel {
  final String id;
  final String email;
  final String name;
  final String token;
  final String role;

  //Dùng required để bắt buộc phải có các tham số lúc khởi tạo
  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.token,
    this.role = 'STAFF',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      token: json['token'],
      role: json['role'] ?? 'STAFF',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'token': token,
      'role': role,
    };
  }

  // 👇 THÊM HÀM NÀY để đọc từ SQLite
  // Từ Map (database) → Object
  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'],
      email: map['email'],
      name: map['name'],
      token: map['token'],
      role: map['role'] ?? 'STAFF',
    );
  }
}
