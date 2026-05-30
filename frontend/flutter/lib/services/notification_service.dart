import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:workmanager/workmanager.dart';

const String periodicTaskName = 'periodicNotificationCheck';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(settings);

    _initialized = true;
  }

  Future<void> showPeriodEndNotification({
    required String subject,
    String classGroup = '',
    String nextSubject = '',
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'period_end',
      'Period End Alerts',
      channelDescription: 'Notifications when a teaching period ends',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'Period Ended',
      'Period ended — $subject ${classGroup.isNotEmpty ? classGroup : ''} is done',
      details,
    );

    // Show next period info
    if (nextSubject.isNotEmpty) {
      await Future.delayed(const Duration(seconds: 2));
      await _plugin.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000 + 1,
        'Up Next',
        'Next period: $nextSubject',
        details,
      );
    }
  }

  Future<void> showFiveMinWarning({
    required String subject,
    String classGroup = '',
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'five_min_warning',
      '5-Minute Warnings',
      channelDescription: '5-minute warnings before period ends',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      playSound: true,
    );

    const details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      '5 Minutes Left',
      '5 minutes left — $subject ${classGroup.isNotEmpty ? classGroup : ''}',
      details,
    );
  }

  Future<void> showPeriodStartNotification({
    required String subject,
    String classGroup = '',
    String room = '',
  }) async {
    final body = 'Period started — $subject ${classGroup.isNotEmpty ? classGroup : ''}${room.isNotEmpty ? ' in $room' : ''}';

    const androidDetails = AndroidNotificationDetails(
      'period_start',
      'Period Start Alerts',
      channelDescription: 'Notifications when a period starts',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
    );

    const details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'Period Started',
      body,
      details,
    );
  }

  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }
}

// WorkManager callback
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    // This runs in background - check schedule and notify
    return Future.value(true);
  });
}
