import 'package:flutter/material.dart';
import '../models/timetable_entry.dart';
import 'period_cell.dart';
import '../utils/schedule_engine.dart';
import '../models/app_settings.dart';

class TimetableGrid extends StatelessWidget {
  final List<TimetableEntry> assignments;
  final AppSettings settings;
  final String Function(String day) getDayName;
  final void Function(String day, String startTime, int duration) onEmptyCellTap;
  final void Function(TimetableEntry entry) onFilledCellTap;

  const TimetableGrid({
    super.key,
    required this.assignments,
    required this.settings,
    required this.getDayName,
    required this.onEmptyCellTap,
    required this.onFilledCellTap,
  });

  @override
  Widget build(BuildContext context) {
    final engine = ScheduleEngine(settings);
    final slots = engine.generateDailySlots();
    final days = ['M', 'T', 'W', 'Th', 'F'];
    final now = DateTime.now();
    final nowDayKey = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'][now.weekday % 7];
    final nowMinutes = now.hour * 60 + now.minute;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          columnSpacing: 4,
          headingRowHeight: 40,
          dataRowMinHeight: 52,
          dataRowMaxHeight: 52,
          columns: [
            const DataColumn(label: Text('#', style: TextStyle(fontSize: 11))),
            const DataColumn(label: Text('Time', style: TextStyle(fontSize: 11))),
            ...days.map((day) => DataColumn(
              label: Text(getDayName(day).substring(0, 3), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
            )),
          ],
          rows: slots.map((slot) {
            final isBreak = slot['type'] == 'break';

            return DataRow(cells: [
              DataCell(Text(
                slot['periodNumber']?.toString() ?? '',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              )),
              DataCell(Text(
                slot['startTime'] as String,
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              )),
              ...days.map((day) {
                if (isBreak) {
                  return DataCell(SizedBox(
                    width: 90,
                    child: PeriodCell(
                      isBreak: true,
                      breakName: slot['name'] as String,
                      startTime: slot['startTime'] as String,
                    ),
                  ));
                }

                final matched = assignments.firstWhere(
                  (a) => a.day == day && a.startTime == slot['startTime'],
                  orElse: () => TimetableEntry(day: '', startTime: '', endTime: '', subject: ''),
                );

                if (matched.day.isEmpty) {
                  final duration = slot['duration'] as int;
                  return DataCell(SizedBox(
                    width: 90,
                    child: PeriodCell(
                      isEmpty: true,
                      startTime: slot['startTime'] as String,
                      onTap: () => onEmptyCellTap(day, slot['startTime'] as String, duration),
                    ),
                  ));
                }

                final isActive = day == nowDayKey &&
                    nowMinutes >= engine.timeToMinutes(matched.startTime) &&
                    nowMinutes < engine.timeToMinutes(matched.startTime) + matched.duration;

                return DataCell(SizedBox(
                  width: 90,
                  child: PeriodCell(
                    entry: matched,
                    isActive: isActive,
                    startTime: matched.startTime,
                    onTap: () => onFilledCellTap(matched),
                  ),
                ));
              }),
            ]);
          }).toList(),
        ),
      ),
    );
  }
}
