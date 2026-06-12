class TicketModel {
  final String id;
  final String holderName;
  final String qrCode;
  final String status;
  final String? checkedInAt;
  final bool synced;

  TicketModel({
    required this.id,
    required this.holderName,
    required this.qrCode,
    required this.status,
    this.checkedInAt,
    this.synced = false,
  });

  // Từ JSON (API) → Object
  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] as String,
      holderName: json['holderName'] as String,
      qrCode: json['qrPayload'] as String,
      status: json['status'] as String,
      checkedInAt: json['checkedInAt'] as String?,
      synced: json['synced'] ?? false,
    );
  }

  // Từ Map (database) → Object
  factory TicketModel.fromMap(Map<String, dynamic> map) {
    return TicketModel(
      id: map['id'] as String,
      holderName: map['holderName'] as String,
      qrCode: map['qrPayload'] as String,
      status: map['status'] as String,
      checkedInAt: map['checkedInAt'] as String?,
      synced: map['synced'] == 1,
    );
  }

  // Object → Map (để lưu vào database)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'holderName' : holderName,
      'qrPayload': qrCode,
      'status': status,
      'checkedInAt': checkedInAt,
      'synced': synced ? 1 : 0,
    };
  }
}