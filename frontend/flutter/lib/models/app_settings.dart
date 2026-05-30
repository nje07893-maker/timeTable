class AppSettings {
  final String schoolStart;
  final int periodDuration;
  final int numPeriods;
  final String teacherName;
  final String schoolName;
  final bool soundEnabled;
  final bool notificationEnabled;
  final String alertSound;
  final bool darkMode;
  final List<BreakSlot> breakSlots;

  AppSettings({
    this.schoolStart = '08:00',
    this.periodDuration = 40,
    this.numPeriods = 12,
    this.teacherName = '',
    this.schoolName = '',
    this.soundEnabled = true,
    this.notificationEnabled = true,
    this.alertSound = 'bell',
    this.darkMode = false,
    List<BreakSlot>? breakSlots,
  }) : breakSlots = breakSlots ?? [
          BreakSlot(name: 'Break', start: '10:00', duration: 20),
          BreakSlot(name: 'Lunch', start: '11:40', duration: 90),
          BreakSlot(name: 'Afternoon Break', start: '15:10', duration: 20),
        ];

  Map<String, dynamic> toMap() {
    return {
      'schoolStart': schoolStart,
      'periodDuration': periodDuration,
      'numPeriods': numPeriods,
      'teacherName': teacherName,
      'schoolName': schoolName,
      'soundEnabled': soundEnabled ? 1 : 0,
      'notificationEnabled': notificationEnabled ? 1 : 0,
      'alertSound': alertSound,
      'darkMode': darkMode ? 1 : 0,
    };
  }

  factory AppSettings.fromMap(Map<String, dynamic> map) {
    return AppSettings(
      schoolStart: map['schoolStart'] as String? ?? '08:00',
      periodDuration: map['periodDuration'] as int? ?? 40,
      numPeriods: map['numPeriods'] as int? ?? 12,
      teacherName: map['teacherName'] as String? ?? '',
      schoolName: map['schoolName'] as String? ?? '',
      soundEnabled: (map['soundEnabled'] as int? ?? 1) == 1,
      notificationEnabled: (map['notificationEnabled'] as int? ?? 1) == 1,
      alertSound: map['alertSound'] as String? ?? 'bell',
      darkMode: (map['darkMode'] as int? ?? 0) == 1,
    );
  }

  AppSettings copyWith({
    String? schoolStart,
    int? periodDuration,
    int? numPeriods,
    String? teacherName,
    String? schoolName,
    bool? soundEnabled,
    bool? notificationEnabled,
    String? alertSound,
    bool? darkMode,
    List<BreakSlot>? breakSlots,
  }) {
    return AppSettings(
      schoolStart: schoolStart ?? this.schoolStart,
      periodDuration: periodDuration ?? this.periodDuration,
      numPeriods: numPeriods ?? this.numPeriods,
      teacherName: teacherName ?? this.teacherName,
      schoolName: schoolName ?? this.schoolName,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      notificationEnabled: notificationEnabled ?? this.notificationEnabled,
      alertSound: alertSound ?? this.alertSound,
      darkMode: darkMode ?? this.darkMode,
      breakSlots: breakSlots ?? this.breakSlots,
    );
  }
}

class BreakSlot {
  final String name;
  final String start;
  final int duration;

  BreakSlot({
    required this.name,
    required this.start,
    this.duration = 20,
  });

  Map<String, dynamic> toMap() => {'name': name, 'start': start, 'duration': duration};

  factory BreakSlot.fromMap(Map<String, dynamic> map) => BreakSlot(
    name: map['name'] as String,
    start: map['start'] as String,
    duration: map['duration'] as int? ?? 20,
  );
}
