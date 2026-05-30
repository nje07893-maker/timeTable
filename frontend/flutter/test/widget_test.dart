import 'package:flutter_test/flutter_test.dart';
import 'package:teacher_timetable/models/timetable_entry.dart';
import 'package:teacher_timetable/utils/schedule_engine.dart';
import 'package:teacher_timetable/models/app_settings.dart';
import 'package:teacher_timetable/utils/color_palette.dart';

void main() {
  group('TimetableEntry', () {
    test('should create entry with defaults', () {
      final entry = TimetableEntry(
        day: 'M',
        startTime: '08:00',
        endTime: '08:40',
        subject: 'MATH',
      );
      expect(entry.day, 'M');
      expect(entry.subject, 'MATH');
      expect(entry.duration, 40);
      expect(entry.classGroup, '');
    });

    test('should convert to and from map', () {
      final entry = TimetableEntry(
        id: 1,
        day: 'T',
        periodNumber: 3,
        startTime: '09:20',
        endTime: '10:00',
        subject: 'ENGLISH',
        classGroup: 'S1B',
        room: 'Rm 5',
        duration: 40,
        colorHex: '#2ECC71',
      );

      final map = entry.toMap();
      final restored = TimetableEntry.fromMap(map);
      expect(restored.id, entry.id);
      expect(restored.day, entry.day);
      expect(restored.subject, entry.subject);
      expect(restored.classGroup, entry.classGroup);
    });

    test('copyWith should override fields', () {
      final entry = TimetableEntry(day: 'M', startTime: '08:00', endTime: '08:40', subject: 'MATH');
      final copy = entry.copyWith(subject: 'ICT', room: 'Lab');
      expect(copy.subject, 'ICT');
      expect(copy.room, 'Lab');
      expect(copy.day, 'M'); // unchanged
    });
  });

  group('ScheduleEngine', () {
    test('should generate daily slots with breaks', () {
      final settings = AppSettings();
      final engine = ScheduleEngine(settings);
      final slots = engine.generateDailySlots();

      expect(slots.isNotEmpty, true);
      // Should include break slots
      final breaks = slots.where((s) => s['type'] == 'break');
      expect(breaks.length, greaterThanOrEqualTo(3));
    });

    test('should detect conflicts', () {
      final settings = AppSettings();
      final engine = ScheduleEngine(settings);

      final entries = [
        TimetableEntry(day: 'M', startTime: '08:00', endTime: '08:40', subject: 'MATH', duration: 40),
        TimetableEntry(day: 'M', startTime: '08:20', endTime: '09:00', subject: 'ICT', duration: 40),
      ];

      final conflicts = engine.detectConflicts(entries);
      expect(conflicts.length, 1);
    });

    test('should compute teaching hours', () {
      final settings = AppSettings();
      final engine = ScheduleEngine(settings);

      final entries = [
        TimetableEntry(day: 'M', startTime: '08:00', endTime: '08:40', subject: 'MATH', duration: 40),
        TimetableEntry(day: 'T', startTime: '09:00', endTime: '09:40', subject: 'MATH', duration: 40),
        TimetableEntry(day: 'W', startTime: '10:00', endTime: '10:40', subject: 'ICT', duration: 40),
      ];

      final hours = engine.computeTeachingHours(entries);
      expect(hours['MATH'], closeTo(1.33, 0.01)); // 80 min = 1.33 hrs
      expect(hours['ICT'], closeTo(0.67, 0.01)); // 40 min = 0.67 hrs
    });

    test('should get current period', () {
      final settings = AppSettings();
      final engine = ScheduleEngine(settings);

      final entries = [
        TimetableEntry(day: 'M', startTime: '08:00', endTime: '08:40', subject: 'MATH', duration: 40),
        TimetableEntry(day: 'M', startTime: '09:00', endTime: '09:40', subject: 'ICT', duration: 40),
      ];

      // Monday 08:30 (weekday = 1)
      final monday = DateTime(2026, 5, 25, 8, 30);
      final current = engine.getCurrentPeriod(entries, monday);
      expect(current, isNotNull);
      expect(current!.subject, 'MATH');
    });
  });

  group('SubjectColors', () {
    test('should return predefined colors for known subjects', () {
      expect(SubjectColors.getColor('MATH'), equals(const Color(0xFFE74C3C)));
      expect(SubjectColors.getColor('ICT'), equals(const Color(0xFF4A90D9)));
      expect(SubjectColors.getColor('ENGLISH'), equals(const Color(0xFF2ECC71)));
    });

    test('should generate consistent color for unknown subjects', () {
      final c1 = SubjectColors.getColor('PHYSICS');
      final c2 = SubjectColors.getColor('PHYSICS');
      expect(c1, equals(c2)); // Consistent
    });
  });

  group('AppSettings', () {
    test('should have sensible defaults', () {
      final settings = AppSettings();
      expect(settings.schoolStart, '08:00');
      expect(settings.periodDuration, 40);
      expect(settings.numPeriods, 12);
      expect(settings.soundEnabled, true);
      expect(settings.breakSlots.length, 3);
    });

    test('should convert to and from map', () {
      final settings = AppSettings(
        teacherName: 'Mr. Jones',
        schoolName: 'Test School',
        soundEnabled: false,
        darkMode: true,
      );
      final map = settings.toMap();
      final restored = AppSettings.fromMap(map);
      expect(restored.teacherName, 'Mr. Jones');
      expect(restored.soundEnabled, false);
      expect(restored.darkMode, true);
    });
  });
}
