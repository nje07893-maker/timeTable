import 'package:flutter/material.dart';
import '../models/timetable_entry.dart';
import '../utils/color_palette.dart';

class PeriodCell extends StatelessWidget {
  final TimetableEntry? entry;
  final bool isBreak;
  final String breakName;
  final bool isEmpty;
  final bool isActive;
  final String startTime;
  final VoidCallback? onTap;

  const PeriodCell({
    super.key,
    this.entry,
    this.isBreak = false,
    this.breakName = '',
    this.isEmpty = false,
    this.isActive = false,
    required this.startTime,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isBreak) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: theme.brightness == Brightness.light
                ? const Color(0xFFFEF3C7)
                : const Color(0xFF422006),
            border: Border.all(color: const Color(0xFFF59E0B)),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Center(
            child: Text(
              breakName,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: theme.brightness == Brightness.light
                    ? const Color(0xFF92400E)
                    : const Color(0xFFFBBF24),
              ),
            ),
          ),
        ),
      );
    }

    if (isEmpty) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: theme.dividerColor, style: BorderStyle.solid),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Center(
            child: Icon(Icons.add, size: 18, color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5)),
          ),
        ),
      );
    }

    if (entry == null) return const SizedBox();

    final color = Color(int.parse(entry!.colorHex.replaceFirst('#', '0xFF')));

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(4),
          border: isActive ? Border.all(color: Colors.greenAccent, width: 2) : null,
          boxShadow: isActive
              ? [BoxShadow(color: Colors.greenAccent.withOpacity(0.3), blurRadius: 4)]
              : null,
        ),
        padding: const EdgeInsets.all(3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              entry!.subject,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
              overflow: TextOverflow.ellipsis,
            ),
            if (entry!.classGroup.isNotEmpty)
              Text(
                entry!.classGroup,
                style: const TextStyle(color: Colors.white70, fontSize: 9),
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
      ),
    );
  }
}
