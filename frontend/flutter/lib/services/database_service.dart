import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/timetable_entry.dart';
import '../models/app_settings.dart';

class DatabaseService {
  static Database? _database;
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'timetable.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE timetable_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            periodNumber INTEGER DEFAULT 0,
            startTime TEXT NOT NULL,
            endTime TEXT,
            subject TEXT NOT NULL,
            classGroup TEXT DEFAULT '',
            room TEXT DEFAULT '',
            duration INTEGER DEFAULT 40,
            colorHex TEXT DEFAULT '#6C5CE7'
          )
        ''');
        await db.execute('''
          CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        ''');
        await _insertDemoData(db);
      },
    );
  }

  Future<void> _insertDemoData(Database db) async {
    final demoData = [
      {'day': 'M', 'periodNumber': 5, 'startTime': '11:00', 'endTime': '11:40', 'subject': 'ICT', 'classGroup': 'S2A', 'room': 'Lab 2', 'duration': 40, 'colorHex': '#4A90D9'},
      {'day': 'T', 'periodNumber': 9, 'startTime': '14:30', 'endTime': '15:10', 'subject': 'MATH', 'classGroup': 'S1A', 'room': 'Rm 12', 'duration': 40, 'colorHex': '#E74C3C'},
      {'day': 'T', 'periodNumber': 10, 'startTime': '15:30', 'endTime': '16:10', 'subject': 'MATH', 'classGroup': '', 'room': '', 'duration': 40, 'colorHex': '#E74C3C'},
      {'day': 'W', 'periodNumber': 8, 'startTime': '13:50', 'endTime': '14:30', 'subject': 'MATH', 'classGroup': '', 'room': '', 'duration': 40, 'colorHex': '#E74C3C'},
      {'day': 'W', 'periodNumber': 9, 'startTime': '14:30', 'endTime': '15:10', 'subject': 'MATH', 'classGroup': '', 'room': '', 'duration': 40, 'colorHex': '#E74C3C'},
      {'day': 'Th', 'periodNumber': 2, 'startTime': '08:40', 'endTime': '09:20', 'subject': 'MATH', 'classGroup': '', 'room': '', 'duration': 40, 'colorHex': '#E74C3C'},
      {'day': 'Th', 'periodNumber': 3, 'startTime': '09:20', 'endTime': '10:00', 'subject': 'MATH', 'classGroup': '', 'room': '', 'duration': 40, 'colorHex': '#E74C3C'},
    ];

    for (final data in demoData) {
      await db.insert('timetable_entries', data);
    }

    // Default settings
    final defaultSettings = {
      'schoolStart': '08:00',
      'periodDuration': '40',
      'numPeriods': '12',
      'teacherName': '',
      'schoolName': '',
      'soundEnabled': '1',
      'notificationEnabled': '1',
      'alertSound': 'bell',
      'darkMode': '0',
    };

    for (final entry in defaultSettings.entries) {
      await db.insert('settings', {'key': entry.key, 'value': entry.value});
    }
  }

  // ===== Timetable CRUD =====

  Future<List<TimetableEntry>> getAllEntries() async {
    final db = await database;
    final maps = await db.query('timetable_entries', orderBy: 'day, startTime');
    return maps.map((m) => TimetableEntry.fromMap(m)).toList();
  }

  Future<List<TimetableEntry>> getEntriesByDay(String day) async {
    final db = await database;
    final maps = await db.query('timetable_entries', where: 'day = ?', whereArgs: [day], orderBy: 'startTime');
    return maps.map((m) => TimetableEntry.fromMap(m)).toList();
  }

  Future<TimetableEntry?> getEntryById(int id) async {
    final db = await database;
    final maps = await db.query('timetable_entries', where: 'id = ?', whereArgs: [id]);
    if (maps.isEmpty) return null;
    return TimetableEntry.fromMap(maps.first);
  }

  Future<int> insertEntry(TimetableEntry entry) async {
    final db = await database;
    return await db.insert('timetable_entries', entry.toMap());
  }

  Future<int> updateEntry(TimetableEntry entry) async {
    final db = await database;
    return await db.update('timetable_entries', entry.toMap(), where: 'id = ?', whereArgs: [entry.id]);
  }

  Future<int> deleteEntry(int id) async {
    final db = await database;
    return await db.delete('timetable_entries', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteAllEntries() async {
    final db = await database;
    await db.delete('timetable_entries');
  }

  Future<void> importEntries(List<TimetableEntry> entries) async {
    final db = await database;
    await db.delete('timetable_entries');
    for (final entry in entries) {
      await db.insert('timetable_entries', entry.toMap());
    }
  }

  // ===== Settings =====

  Future<AppSettings> getSettings() async {
    final db = await database;
    final maps = await db.query('settings');
    final map = <String, dynamic>{};
    for (final row in maps) {
      final key = row['key'] as String;
      final value = row['value'] as String;
      if (key == 'soundEnabled' || key == 'notificationEnabled' || key == 'darkMode') {
        map[key] = int.tryParse(value) ?? 0;
      } else if (key == 'periodDuration' || key == 'numPeriods') {
        map[key] = int.tryParse(value) ?? 40;
      } else {
        map[key] = value;
      }
    }
    return AppSettings.fromMap(map);
  }

  Future<void> saveSettings(AppSettings settings) async {
    final db = await database;
    final map = settings.toMap();
    for (final entry in map.entries) {
      await db.insert(
        'settings',
        {'key': entry.key, 'value': entry.value.toString()},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
  }
}
