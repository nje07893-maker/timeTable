import 'package:flutter/material.dart';

class SubjectColors {
  static const Map<String, Color> predefined = {
    'MATH': Color(0xFFE74C3C),
    'ICT': Color(0xFF4A90D9),
    'ENGLISH': Color(0xFF2ECC71),
    'SCIENCE': Color(0xFF9B59B6),
    'HISTORY': Color(0xFFF39C12),
    'GEOGRAPHY': Color(0xFF1ABC9C),
    'ART': Color(0xFFE91E63),
    'MUSIC': Color(0xFFFF5722),
    'PE': Color(0xFF8BC34A),
    'FRENCH': Color(0xFF00BCD4),
    'KISWAHILI': Color(0xFF795548),
    'BIBLE': Color(0xFF607D8B),
  };

  static Color getColor(String subject) {
    final upper = subject.toUpperCase();
    if (predefined.containsKey(upper)) return predefined[upper]!;

    // Generate consistent color from subject name
    final hash = subject.hashCode;
    final hue = hash.abs() % 360;
    return HSLColor.fromAHSL(1.0, hue.toDouble(), 0.65, 0.55).toColor();
  }

  static Color autoAssign(String subject) => getColor(subject);
}
