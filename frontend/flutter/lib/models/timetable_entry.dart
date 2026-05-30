class TimetableEntry {
  final int? id;
  final String day; // M, T, W, Th, F
  final int periodNumber;
  final String startTime;
  final String endTime;
  final String subject;
  final String classGroup;
  final String room;
  final int duration;
  final String colorHex;

  TimetableEntry({
    this.id,
    required this.day,
    this.periodNumber = 0,
    required this.startTime,
    required this.endTime,
    required this.subject,
    this.classGroup = '',
    this.room = '',
    this.duration = 40,
    this.colorHex = '#6C5CE7',
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'day': day,
      'periodNumber': periodNumber,
      'startTime': startTime,
      'endTime': endTime,
      'subject': subject,
      'classGroup': classGroup,
      'room': room,
      'duration': duration,
      'colorHex': colorHex,
    };
  }

  factory TimetableEntry.fromMap(Map<String, dynamic> map) {
    return TimetableEntry(
      id: map['id'] as int?,
      day: map['day'] as String,
      periodNumber: map['periodNumber'] as int? ?? 0,
      startTime: map['startTime'] as String,
      endTime: map['endTime'] as String? ?? '',
      subject: map['subject'] as String,
      classGroup: map['classGroup'] as String? ?? '',
      room: map['room'] as String? ?? '',
      duration: map['duration'] as int? ?? 40,
      colorHex: map['colorHex'] as String? ?? '#6C5CE7',
    );
  }

  TimetableEntry copyWith({
    int? id,
    String? day,
    int? periodNumber,
    String? startTime,
    String? endTime,
    String? subject,
    String? classGroup,
    String? room,
    int? duration,
    String? colorHex,
  }) {
    return TimetableEntry(
      id: id ?? this.id,
      day: day ?? this.day,
      periodNumber: periodNumber ?? this.periodNumber,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      subject: subject ?? this.subject,
      classGroup: classGroup ?? this.classGroup,
      room: room ?? this.room,
      duration: duration ?? this.duration,
      colorHex: colorHex ?? this.colorHex,
    );
  }
}
