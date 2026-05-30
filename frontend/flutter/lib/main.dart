import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/timetable_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/home_screen.dart';
import 'screens/week_view_screen.dart';
import 'screens/add_edit_screen.dart';
import 'screens/settings_screen.dart';
import 'services/database_service.dart';
import 'services/notification_service.dart';
import 'services/audio_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize services
  final dbService = DatabaseService();
  await dbService.database;

  final notificationService = NotificationService();
  await notificationService.init();

  final audioService = AudioService();
  await audioService.init();

  final timetableProvider = TimetableProvider();
  await timetableProvider.loadEntries();

  final settingsProvider = AppSettingsProvider();
  await settingsProvider.loadSettings();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: timetableProvider),
        ChangeNotifierProvider.value(value: settingsProvider),
      ],
      child: const TeacherTimetableApp(),
    ),
  );
}

class TeacherTimetableApp extends StatelessWidget {
  const TeacherTimetableApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsProvider = context.watch<AppSettingsProvider>();

    return MaterialApp(
      title: 'Teacher Timetable',
      debugShowCheckedModeBanner: false,
      themeMode: settingsProvider.themeMode,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF4A6CF7),
        useMaterial3: true,
        brightness: Brightness.light,
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xFF4A6CF7),
        useMaterial3: true,
        brightness: Brightness.dark,
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
      ),
      home: const MainScaffold(),
      routes: {
        '/add': (context) => const AddEditScreen(),
      },
    );
  }
}

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const WeekViewScreen(),
    const AddEditScreen(),
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final settingsProvider = context.watch<AppSettingsProvider>();
    final s = settingsProvider.settings;
    final teacher = s.teacherName;
    final school = s.schoolName;

    String subtitle = '';
    if (teacher.isNotEmpty && school.isNotEmpty) {
      subtitle = '$teacher · $school';
    } else if (teacher.isNotEmpty) {
      subtitle = teacher;
    } else if (school.isNotEmpty) {
      subtitle = school;
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Timetable', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (subtitle.isNotEmpty)
              Text(subtitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Text(
                TimeOfDay.now().format(context),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.calendar_view_week_outlined), selectedIcon: Icon(Icons.calendar_view_week), label: 'Week'),
          NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Add'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
