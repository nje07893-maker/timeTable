import 'package:flutter/material.dart';
import '../models/app_settings.dart';
import '../services/database_service.dart';

class AppSettingsProvider extends ChangeNotifier {
  final DatabaseService _db = DatabaseService();
  AppSettings _settings = AppSettings();

  AppSettings get settings => _settings;

  Future<void> loadSettings() async {
    _settings = await _db.getSettings();
    notifyListeners();
  }

  Future<void> updateSettings(AppSettings newSettings) async {
    _settings = newSettings;
    await _db.saveSettings(newSettings);
    notifyListeners();
  }

  ThemeMode get themeMode => _settings.darkMode ? ThemeMode.dark : ThemeMode.light;
}
