import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/timetable_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/status_card.dart';
import '../widgets/period_cell.dart';
import '../utils/schedule_engine.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _countdown = '--:--';
  String _nextCountdown = '--:--';

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {});
        _startCountdown();
      }
    });
  }

  String _formatCountdown(int minutes) {
    final m = minutes ~/ 1;
    final s = ((minutes - m) * 60).round();
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String _getDayName(String day) {
    const map = {'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 'F': 'Friday'};
    return map[day] ?? day;
  }

  @override
  Widget build(BuildContext context) {
    final timetableProvider = context.watch<TimetableProvider>();
    final settingsProvider = context.watch<AppSettingsProvider>();
    final settings = settingsProvider.settings;
    final engine = ScheduleEngine(settings);
    final now = DateTime.now();
    const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
    final dayKey = days[now.weekday % 7];

    final current = engine.getCurrentPeriod(timetableProvider.entries, now);
    final next = engine.getNextPeriod(timetableProvider.entries, now);

    if (current != null) {
      final end = engine.timeToMinutes(current.startTime) + current.duration;
      final remaining = end - (now.hour * 60 + now.minute);
      _countdown = _formatCountdown(remaining);
    } else {
      _countdown = '--:--';
    }

    if (next != null) {
      final nextStart = engine.timeToMinutes(next.startTime);
      final minutesUntil = nextStart - (now.hour * 60 + now.minute);
      _nextCountdown = _formatCountdown(minutesUntil);
    } else {
      _nextCountdown = '--:--';
    }

    return RefreshIndicator(
      onRefresh: () async {
        await timetableProvider.loadEntries();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status cards
          Row(
            children: [
              Expanded(
                child: StatusCard(
                  label: 'Current Period',
                  title: current != null
                      ? '${current.subject} ${current.classGroup.isNotEmpty ? current.classGroup : ''}'
                      : (next != null ? 'Between periods' : 'No classes now'),
                  subtitle: current?.room ?? '',
                  countdown: _countdown,
                  accentColor: Colors.green,
                  icon: Icons.play_circle_filled,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatusCard(
                  label: 'Up Next',
                  title: next != null
                      ? '${next.subject} ${next.classGroup.isNotEmpty ? next.classGroup : ''}'
                      : 'End of day',
                  subtitle: next != null ? 'at ${next.startTime}' : '',
                  countdown: _nextCountdown,
                  accentColor: Theme.of(context).colorScheme.primary,
                  icon: Icons.skip_next,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Today's schedule
          Text(
            "${_getDayName(dayKey)}'s Schedule",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),

          if (dayKey == 'SUN' || dayKey == 'S')
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: Text('No classes today', style: TextStyle(color: Colors.grey))),
            )
          else
            ..._buildDaySchedule(context, engine, timetableProvider.entries, dayKey, now),
        ],
      ),
    );
  }

  List<Widget> _buildDaySchedule(
    BuildContext context,
    ScheduleEngine engine,
    List entries,
    String dayKey,
    DateTime now,
  ) {
    final slots = engine.generateDailySlots();
    final dayAssignments = entries.where((e) => e.day == dayKey).toList();
    final nowMinutes = now.hour * 60 + now.minute;
    final widgets = <Widget>[];

    for (final slot in slots) {
      final isBreak = slot['type'] == 'break';
      final startTime = slot['startTime'] as String;
      final duration = slot['duration'] as int;

      if (isBreak) {
        widgets.add(
          Container(
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.light
                  ? const Color(0xFFFEF3C7)
                  : const Color(0xFF422006),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                const SizedBox(
                  width: 70,
                  child: Text('BREAK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFF59E0B))),
                ),
                Text(slot['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                const Spacer(),
                Text(startTime, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
        );
      } else {
        final matched = dayAssignments.cast().firstWhere(
          (a) => a.startTime == startTime,
          orElse: () => null,
        );

        if (matched != null) {
          final sMin = engine.timeToMinutes(startTime);
          final eMin = sMin + duration;
          final isActive = nowMinutes >= sMin && nowMinutes < eMin;
          final color = Color(int.parse(matched.colorHex.replaceFirst('#', '0xFF')));

          widgets.add(
            Card(
              margin: const EdgeInsets.only(bottom: 4),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: isActive
                    ? const BorderSide(color: Colors.greenAccent, width: 2)
                    : BorderSide.none,
              ),
              child: ListTile(
                dense: true,
                leading: Container(
                  width: 50,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    matched.subject,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                ),
                title: Text(matched.subject, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  '${matched.classGroup.isNotEmpty ? matched.classGroup : ''}${matched.room.isNotEmpty ? ' · ${matched.room}' : ''}',
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: Text(startTime, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ),
            ),
          );
        } else {
          widgets.add(
            Card(
              margin: const EdgeInsets.only(bottom: 4),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(color: Colors.grey.shade300, style: BorderStyle.solid),
              ),
              child: ListTile(
                dense: true,
                title: Text('${startTime} - Empty', style: const TextStyle(color: Colors.grey)),
                trailing: const Icon(Icons.add_circle_outline, color: Colors.grey, size: 20),
                onTap: () {
                  Navigator.pushNamed(context, '/add', arguments: {
                    'day': dayKey,
                    'startTime': startTime,
                    'duration': duration,
                  });
                },
              ),
            ),
          );
        }
      }
    }
    return widgets;
  }
}
