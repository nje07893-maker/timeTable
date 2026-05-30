import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/timetable_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/timetable_grid.dart';
import '../models/timetable_entry.dart';

class WeekViewScreen extends StatelessWidget {
  const WeekViewScreen({super.key});

  String _getDayName(String day) {
    const map = {'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday'};
    return map[day] ?? day;
  }

  @override
  Widget build(BuildContext context) {
    final timetableProvider = context.watch<TimetableProvider>();
    final settingsProvider = context.watch<AppSettingsProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'Weekly Timetable',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        Expanded(
          child: TimetableGrid(
            assignments: timetableProvider.entries,
            settings: settingsProvider.settings,
            getDayName: _getDayName,
            onEmptyCellTap: (day, startTime, duration) {
              Navigator.pushNamed(context, '/add', arguments: {
                'day': day,
                'startTime': startTime,
                'duration': duration,
              });
            },
            onFilledCellTap: (entry) {
              _showPeriodDetail(context, entry);
            },
          ),
        ),
      ],
    );
  }

  void _showPeriodDetail(BuildContext context, TimetableEntry entry) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Color(int.parse(entry.colorHex.replaceFirst('#', '0xFF'))),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      entry.subject,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/add', arguments: entry);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (dCtx) => AlertDialog(
                          title: const Text('Delete'),
                          content: Text('Delete ${entry.subject}?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(dCtx, false), child: const Text('Cancel')),
                            TextButton(onPressed: () => Navigator.pop(dCtx, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirm == true && context.mounted) {
                        context.read<TimetableProvider>().deleteEntry(entry.id!);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _detailRow('Day', _getDayName(entry.day)),
              _detailRow('Time', '${entry.startTime} - ${entry.endTime}'),
              _detailRow('Class', entry.classGroup.isNotEmpty ? entry.classGroup : '—'),
              _detailRow('Room', entry.room.isNotEmpty ? entry.room : '—'),
              _detailRow('Duration', '${entry.duration} min'),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14))),
        ],
      ),
    );
  }
}
