class ConcertModel {
  final String id;
  final String name;
  final String date;
  final String venue;
  final String? imageUrl;

  ConcertModel({
    required this.id,
    required this.name,
    required this.date,
    required this.venue,
    this.imageUrl,
  });

  factory ConcertModel.fromJson(Map<String, dynamic> json) {
    return ConcertModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      venue: json['venue']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString(),
    );
  }

  factory ConcertModel.fromMap(Map<String, dynamic> map) {
    return ConcertModel(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      date: map['date']?.toString() ?? '',
      venue: map['venue']?.toString() ?? '',
      imageUrl: map['imageUrl']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'date': date,
      'venue': venue,
      'imageUrl': imageUrl,
    };
  }

  String get formattedDateTime {
    try {
      final dateTime = DateTime.parse(date);
      final localDate = dateTime.toLocal();
      final hour = localDate.hour.toString().padLeft(2, '0');
      final minute = localDate.minute.toString().padLeft(2, '0');
      return '${localDate.day}/${localDate.month}/${localDate.year} $hour:$minute';
    } catch (e) {
      return date;
    }
  }
}