import 'package:audioplayers/audioplayers.dart';

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
  }

  Future<void> playBell() async {
    // Use a system tone as bell
    await _player.stop();
    await _player.play(AssetSource('sounds/bell.mp3'));
  }

  Future<void> playChime() async {
    await _player.stop();
    await _player.play(AssetSource('sounds/chime.mp3'));
  }

  Future<void> playBuzzer() async {
    await _player.stop();
    await _player.play(AssetSource('sounds/buzzer.mp3'));
  }

  Future<void> playSound(String type) async {
    switch (type) {
      case 'chime':
        await playChime();
        break;
      case 'buzzer':
        await playBuzzer();
        break;
      default:
        await playBell();
    }
  }

  Future<void> stop() async {
    await _player.stop();
  }

  void dispose() {
    _player.dispose();
  }
}
