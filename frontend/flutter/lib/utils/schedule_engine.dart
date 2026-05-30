import '../models/timetable_entry.dart';
import '../models/app_settings.dart';

class ScheduleEngine {
  final AppSettings config;

  ScheduleEngine(this.config);

  int timeToMinutes(String t) {
    final parts = t.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  String minutesToTime(int m) {
    final h = m ~/ 60;
    final mn = m % 60;
    return '${h.toString().padLeft(2, '0')}:${mn.toString().padLeft(2, '0')}';
  }

  List<Map<String, dynamic>> generateDailySlots() {
    final slots = <Map<String, dynamic>>[];
    int current = timeToMinutes(config.schoolStart);
    final endDay = timeToMinutes('17:00');
    int periodNum = 1;

    // Build break intervals
    final breakIntervals = config.breakSlots.map((b) => {
      'name': b.name,
      'start': timeToMinutes(b.start),
      'end': timeToMinutes(b.start) + b.duration,
    }).toList();

    while (current < endDay && periodNum <= config.numPeriods) {
      // Check if current time falls within a break
      final inBreak = breakIntervals.cast<Map<String, dynamic>>().firstWhere(
        (b) => current >= (b['start'] as int) && current < (b['end'] as int),
        orElse: () => <String, dynamic>{},
      );

      if (inBreak.isNotEmpty) {
        slots.add({
          'type': 'break',
          'name': inBreak['name'],
          'startTime': minutesToTime(inBreak['start'] as int),
          'endTime': minutesToTime(inBreak['end'] as int),
          'periodNumber': null,
        });
        current = inBreak['end'] as int;
        continue;
      }

      // Check if slot would overlap with break
      final nextBreak = breakIntervals.cast<Map<String, dynamic>>().firstWhere(
        (b) => current < (b['end'] as int) && current + config.periodDuration > (b['start'] as int),
        orElse: () => <String, dynamic>{},
      );

      int slotEnd;
      if (nextBreak.isNotEmpty) {
        slotEnd = nextBreak['start'] as int;
      } else {
        slotEnd = (current + config.periodDuration) > endDay ? endDay : current + config.periodDuration;
      }

      final duration = slotEnd - current;
      if (duration > 0) {
        slots.add({
          'type': 'teaching',
          'periodNumber': periodNum,
          'startTime': minutesToTime(current),
          'endTime': minutesToTime(slotEnd),
          'duration': duration,
        });
        periodNum++;
      }
      current = slotEnd;
    }
    return slots;
  }

  TimetableEntry? getCurrentPeriod(List<TimetableEntry> assignments, DateTime now) {
    const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
    final dayKey = days[now.weekday % 7];
    if (dayKey == 'SUN' || dayKey == 'S') return null;

    final nowMinutes = now.hour * 60 + now.minute;
    final todayAssignments = assignments.where((a) => a.day == dayKey).toList();

    for (final a in todayAssignments) {
      if (a.startTime.isNotEmpty) {
        final start = timeToMinutes(a.startTime);
        final end = start + (a.duration);
        if (nowMinutes >= start && nowMinutes < end) return a;
      }
    }
    return null;
  }

  TimetableEntry? getNextPeriod(List<TimetableEntry> assignments, DateTime now) {
    const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
    final dayKey = days[now.weekday % 7];
    if (dayKey == 'SUN' || dayKey == 'S') return null;

    final nowMinutes = now.hour * 60 + now.minute;
    final todayAssignments = assignments
        .where((a) => a.day == dayKey)
        .toList()
      ..sort((a, b) => timeToMinutes(a.startTime).compareTo(timeToMinutes(b.startTime)));

    for (final a in todayAssignments) {
      if (a.startTime.isNotEmpty) {
        final start = timeToMinutes(a.startTime);
        if (nowMinutes < start) return a;
      }
    }
    return null;
  }

  List<Map<String, dynamic>> detectConflicts(List<TimetableEntry> assignments) {
    final conflicts = <Map<String, dynamic>>[];
    final daySlots = <String, List<TimetableEntry>>{};

    for (final a in assignments) {
      daySlots.putIfAbsent(a.day, () => []).add(a);
    }

    for (final entry in daySlots.entries) {
      final slots = entry.value;
      for (int i = 0; i < slots.length; i++) {
        for (int j = i + 1; j < slots.length; j++) {
          final a = slots[i];
          final b = slots[j];
          final aStart = timeToMinutes(a.startTime);
          final aEnd = aStart + a.duration;
          final bStart = timeToMinutes(b.startTime);
          final bEnd = bStart + b.duration;
          if (aStart < bEnd && bStart < aEnd) {
            conflicts.add({
              'day': entry.key,
              'subject1': a.subject,
              'subject2': b.subject,
              'time1': a.startTime,
              'time2': b.startTime,
              'message': 'Overlap on ${entry.key}: "${a.subject}" (${a.startTime}) and "${b.subject}" (${b.startTime})',
            });
          }
        }
      }
    }
    return conflicts;
  }

  Map<String, double> computeTeachingHours(List<TimetableEntry> assignments) {
    final hours = <String, double>{};
    for (final a in assignments) {
      if (a.subject.isNotEmpty) {
        hours[a.subject] = (hours[a.subject] ?? 0) + (a.duration / 60.0);
      }
    }
    return hours;
  }
}
