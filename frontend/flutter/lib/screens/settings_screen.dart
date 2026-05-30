import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/timetable_provider.dart';
import '../models/app_settings.dart';
import '../models/timetable_entry.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _teacherController = TextEditingController();
  final _schoolController = TextEditingController();
  final _startController = TextEditingController();
  final _durationController = TextEditingController();
  final _periodsController = TextEditingController();

  bool _soundEnabled = true;
  bool _notificationEnabled = true;
  bool _darkMode = false;
  String _alertSound = 'bell';

  @override
  void initState() {
    super.initState();
    final provider = context.read<AppSettingsProvider>();
    final s = provider.settings;
    _teacherController.text = s.teacherName;
    _schoolController.text = s.schoolName;
    _startController.text = s.schoolStart;
    _durationController.text = s.periodDuration.toString();
    _periodsController.text = s.numPeriods.toString();
    _soundEnabled = s.soundEnabled;
    _notificationEnabled = s.notificationEnabled;
    _darkMode = s.darkMode;
    _alertSound = s.alertSound;
  }

  @override
  void dispose() {
    _teacherController.dispose();
    _schoolController.dispose();
    _startController.dispose();
    _durationController.dispose();
    _periodsController.dispose();
    super.dispose();
  }

  void _save() {
    final newSettings = AppSettings(
      teacherName: _teacherController.text.trim(),
      schoolName: _schoolController.text.trim(),
      schoolStart: _startController.text.trim(),
      periodDuration: int.tryParse(_durationController.text) ?? 40,
      numPeriods: int.tryParse(_periodsController.text) ?? 12,
      soundEnabled: _soundEnabled,
      notificationEnabled: _notificationEnabled,
      alertSound: _alertSound,
      darkMode: _darkMode,
    );

    context.read<AppSettingsProvider>().updateSettings(newSettings);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved!')),
    );
  }

  void _exportJson() async {
    final timetableProvider = context.read<TimetableProvider>();
    final data = jsonEncode(timetableProvider.entries.map((e) => e.toMap()).toList());
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/timetable_backup.json');
    await file.writeAsString(data);
    await Share.shareXFiles([XFile(file.path)], text: 'Timetable Backup');
  }

  void _resetData() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset All Data?'),
        content: const Text('This will delete all timetable entries and restore demo data.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<TimetableProvider>().resetToDemo();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Data reset to demo')),
              );
            },
            child: const Text('Reset', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final timetableProvider = context.watch<TimetableProvider>();
    timetableProvider.computeHours(context.read<AppSettingsProvider>());
    final hours = timetableProvider.teachingHours;
    final conflicts = timetableProvider.conflicts;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Settings', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),

        // Teacher Info
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Teacher Info', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                TextField(controller: _teacherController, decoration: const InputDecoration(labelText: 'Teacher Name', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _schoolController, decoration: const InputDecoration(labelText: 'School Name', border: OutlineInputBorder())),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Schedule Config
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Schedule Config', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                TextField(controller: _startController, decoration: const InputDecoration(labelText: 'School Start Time', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _durationController, decoration: const InputDecoration(labelText: 'Period Duration (min)', border: OutlineInputBorder()), keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                TextField(controller: _periodsController, decoration: const InputDecoration(labelText: 'Periods Per Day', border: OutlineInputBorder()), keyboardType: TextInputType.number),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Notifications & Sound
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Notifications & Sound', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Sound Enabled'),
                  value: _soundEnabled,
                  onChanged: (v) => setState(() => _soundEnabled = v),
                  contentPadding: EdgeInsets.zero,
                ),
                SwitchListTile(
                  title: const Text('Notifications Enabled'),
                  value: _notificationEnabled,
                  onChanged: (v) => setState(() => _notificationEnabled = v),
                  contentPadding: EdgeInsets.zero,
                ),
                DropdownButtonFormField<String>(
                  value: _alertSound,
                  decoration: const InputDecoration(labelText: 'Alert Sound', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'bell', child: Text('Classic Bell')),
                    DropdownMenuItem(value: 'chime', child: Text('Chime')),
                    DropdownMenuItem(value: 'buzzer', child: Text('Buzzer')),
                  ],
                  onChanged: (v) => setState(() => _alertSound = v!),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Theme
        Card(
          child: SwitchListTile(
            title: const Text('Dark Mode'),
            subtitle: const Text('Toggle dark/light theme'),
            value: _darkMode,
            onChanged: (v) => setState(() => _darkMode = v),
          ),
        ),
        const SizedBox(height: 16),

        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: const Text('Save Settings'),
          ),
        ),
        const SizedBox(height: 24),

        // Teaching Hours Summary
        if (hours.isNotEmpty) ...[
          Text('Teaching Hours Summary', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: hours.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Container(
                        width: 12, height: 12,
                        decoration: BoxDecoration(
                          color: Color(int.parse('#FF${e.key.hashCode.abs().toRadixString(16).padLeft(6, '0').substring(0, 6)}'.replaceFirst('FF', '0xFF'))),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(e.key),
                      const Spacer(),
                      Text('${e.value.toStringAsFixed(1)} hrs', style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Conflicts
        if (conflicts.isNotEmpty) ...[
          Text('Schedule Conflicts', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: Colors.red)),
          const SizedBox(height: 8),
          Card(
            color: Colors.red.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: conflicts.map((c) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Colors.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(c['message'] as String, style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Data Management
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Data Management', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.download),
                    label: const Text('Export JSON Backup'),
                    onPressed: _exportJson,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.upload),
                    label: const Text('Import JSON (TODO)'),
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Import via file picker - use file_picker package')),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.picture_as_pdf),
                    label: const Text('Export PDF (TODO)'),
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('PDF export requires pdf package integration')),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.restart_alt),
                    label: const Text('Reset to Demo Data'),
                    onPressed: _resetData,
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
