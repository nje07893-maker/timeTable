import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/timetable_entry.dart';
import '../providers/timetable_provider.dart';
import '../utils/color_palette.dart';

class AddEditScreen extends StatefulWidget {
  const AddEditScreen({super.key});

  @override
  State<AddEditScreen> createState() => _AddEditScreenState();
}

class _AddEditScreenState extends State<AddEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _classController = TextEditingController();
  final _roomController = TextEditingController();

  String _day = 'M';
  String _startTime = '08:00';
  int _duration = 40;
  String _colorHex = '#6C5CE7';
  int? _editId;

  bool get _isEditing => _editId != null;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;

    if (args == null) return;

    if (args is TimetableEntry) {
      _editId = args.id;
      _day = args.day;
      _startTime = args.startTime;
      _duration = args.duration;
      _colorHex = args.colorHex;
      _subjectController.text = args.subject;
      _classController.text = args.classGroup;
      _roomController.text = args.room;
    } else if (args is Map<String, dynamic>) {
      _editId = null;
      if (args.containsKey('day')) _day = args['day'] as String;
      if (args.containsKey('startTime')) _startTime = args['startTime'] as String;
      if (args.containsKey('duration')) _duration = args['duration'] as int;
    }
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _classController.dispose();
    _roomController.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final subject = _subjectController.text.trim().toUpperCase();
    if (subject.isEmpty) return;

    final color = SubjectColors.getColor(subject);
    final colorHex = '#${color.value.toRadixString(16).substring(2).toUpperCase()}';

    final entry = TimetableEntry(
      id: _editId,
      day: _day,
      startTime: _startTime,
      endTime: _calculateEndTime(_startTime, _duration),
      subject: subject,
      classGroup: _classController.text.trim(),
      room: _roomController.text.trim(),
      duration: _duration,
      colorHex: colorHex,
    );

    final provider = context.read<TimetableProvider>();
    if (_isEditing) {
      provider.updateEntry(entry);
    } else {
      provider.addEntry(entry);
    }

    Navigator.pop(context);
  }

  String _calculateEndTime(String start, int duration) {
    final parts = start.split(':');
    final mins = int.parse(parts[0]) * 60 + int.parse(parts[1]) + duration;
    final h = mins ~/ 60;
    final m = mins % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Period' : 'Add Period'),
        actions: [
          TextButton(onPressed: _save, child: const Text('Save')),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                value: _day,
                decoration: const InputDecoration(labelText: 'Day', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'M', child: Text('Monday')),
                  DropdownMenuItem(value: 'T', child: Text('Tuesday')),
                  DropdownMenuItem(value: 'W', child: Text('Wednesday')),
                  DropdownMenuItem(value: 'Th', child: Text('Thursday')),
                  DropdownMenuItem(value: 'F', child: Text('Friday')),
                ],
                onChanged: (v) => setState(() => _day = v!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _subjectController,
                decoration: const InputDecoration(labelText: 'Subject *', hintText: 'e.g. MATH, ICT', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                textCapitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _classController,
                decoration: const InputDecoration(labelText: 'Class/Group', hintText: 'e.g. S1A, Form 3', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _roomController,
                decoration: const InputDecoration(labelText: 'Room/Location', hintText: 'e.g. Rm 12, Lab 2', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: _startTime,
                      decoration: const InputDecoration(labelText: 'Start Time', border: OutlineInputBorder()),
                      onChanged: (v) => _startTime = v,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      initialValue: _duration.toString(),
                      decoration: const InputDecoration(labelText: 'Duration (min)', border: OutlineInputBorder(), suffixText: 'min'),
                      keyboardType: TextInputType.number,
                      onChanged: (v) => _duration = int.tryParse(v) ?? 40,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _save,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: Text(_isEditing ? 'Update' : 'Add Period'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
