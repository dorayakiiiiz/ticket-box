class TicketModel {
  final String id;
  final String qrCode;
  final String status;
  final String? checkedInAt;
  final bool synced;

  TicketModel({
    required this.id,
    required this.qrCode,
    required this.status,
    this.checkedInAt,
    this.synced = false,
  });

  // Từ JSON (API) → Object
  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] as String? ?? '',
      qrCode: json['qrPayload'] as String? ?? '',
      status: json['status'] as String? ?? 'UNKNOWN',
      checkedInAt: json['checkedInAt'] as String?,
      synced: json['synced'] as bool? ?? false,
    );
  }

  // Từ Map (database) → Object
  factory TicketModel.fromMap(Map<String, dynamic> map) {
    return TicketModel(
      id: map['id'] as String? ?? '',
      qrCode: map['qrPayload'] as String? ?? '',
      status: map['status'] as String? ?? 'UNKNOWN',
      checkedInAt: map['checkedInAt'] as String?,
      synced: map['synced'] == 1,
    );
  }

  // Object → Map (để lưu vào database)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'qrCode': qrCode,
      'status': status,
      'checkedInAt': checkedInAt,
      'synced': synced ? 1 : 0,
    };
  }
}