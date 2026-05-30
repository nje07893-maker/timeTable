import 'package:flutter/material.dart';
import '../models/timetable_entry.dart';
import '../services/database_service.dart';
import '../utils/schedule_engine.dart';
import '../providers/settings_provider.dart';

class TimetableProvider extends ChangeNotifier {
  final DatabaseService _db = DatabaseService();
  List<TimetableEntry> _entries = [];
  List<Map<String, dynamic>> _conflicts = [];
  Map<String, double> _teachingHours = {};

  List<TimetableEntry> get entries => _entries;
  List<Map<String, dynamic>> get conflicts => _conflicts;
  Map<String, double> get teachingHours => _teachingHours;

  Future<void> loadEntries() async {
    _entries = await _db.getAllEntries();
    notifyListeners();
  }

  List<TimetableEntry> getByDay(String day) {
    return _entries.where((e) => e.day == day).toList();
  }

  TimetableEntry? getById(int id) {
    try {
      return _entries.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<void> addEntry(TimetableEntry entry) async {
    final id = await _db.insertEntry(entry);
    _entries.add(entry.copyWith(id: id));
    notifyListeners();
  }

  Future<void> updateEntry(TimetableEntry entry) async {
    await _db.updateEntry(entry);
    final idx = _entries.indexWhere((e) => e.id == entry.id);
    if (idx != -1) _entries[idx] = entry;
    notifyListeners();
  }

  Future<void> deleteEntry(int id) async {
    await _db.deleteEntry(id);
    _entries.removeWhere((e) => e.id == id);
    notifyListeners();
  }

  Future<void> importEntries(List<TimetableEntry> entries) async {
    await _db.importEntries(entries);
    _entries = entries;
    notifyListeners();
  }

  Future<void> resetToDemo() async {
    await _db.deleteAllEntries();
    _entries.clear();
    notifyListeners();
    // Re-insert demo data through database init
    _entries = await _db.getAllEntries();
    notifyListeners();
  }

  void analyzeConflicts(AppSettingsProvider settingsProvider) {
    final engine = ScheduleEngine(settingsProvider.settings);
    _conflicts = engine.detectConflicts(_entries);
    notifyListeners();
  }

  void computeHours(AppSettingsProvider settingsProvider) {
    final engine = ScheduleEngine(settingsProvider.settings);
    _teachingHours = engine.computeTeachingHours(_entries);
    notifyListeners();
  }
}
