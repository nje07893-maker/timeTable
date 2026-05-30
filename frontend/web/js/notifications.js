const Notifications = {
  audioContext: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not available');
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    this.initialized = true;
  },

  playSound(type) {
    const soundType = type || Settings.get('alertSound') || 'bell';
    if (!Settings.get('soundEnabled')) return;
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      if (soundType === 'bell') {
        this._playBell(ctx, now);
      } else if (soundType === 'chime') {
        this._playChime(ctx, now);
      } else if (soundType === 'buzzer') {
        this._playBuzzer(ctx, now);
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  },

  _playBell(ctx, start) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, start);
    osc.frequency.setValueAtTime(1000, start + 0.1);
    osc.frequency.setValueAtTime(1200, start + 0.2);
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1000, start + 0.7);
    osc2.frequency.setValueAtTime(1200, start + 0.8);
    osc2.frequency.setValueAtTime(1400, start + 0.9);
    gain2.gain.setValueAtTime(0.3, start + 0.7);
    gain2.gain.exponentialRampToValueAtTime(0.01, start + 1.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(start + 0.7);
    osc2.stop(start + 1.3);
  },

  _playChime(ctx, start) {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start + i * 0.15);
      gain.gain.setValueAtTime(0.25, start + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, start + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + i * 0.15);
      osc.stop(start + i * 0.15 + 0.5);
    });
  },

  _playBuzzer(ctx, start) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, start);
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.setValueAtTime(0, start + 0.2);
    gain.gain.setValueAtTime(0.2, start + 0.3);
    gain.gain.setValueAtTime(0, start + 0.5);
    gain.gain.setValueAtTime(0.2, start + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.9);
  },

  sendBrowserNotification(title, body) {
    if (!Settings.get('notificationEnabled')) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: 'timetable',
        requireInteraction: true,
      });
    }

    // Also send via service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'show-notification',
        title: title,
        body: body,
        tag: 'timetable',
      });
    }
  },

  showToast(title, body, type) {
    const toast = document.getElementById('notification-toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').textContent = body;

    toast.classList.remove('hidden');

    if (type === 'warning') {
      toast.style.borderLeftColor = '#f59e0b';
    } else if (type === 'period-end') {
      toast.style.borderLeftColor = '#ef4444';
    } else {
      toast.style.borderLeftColor = '#10b981';
    }

    // Play sound
    this.playSound();

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 6000);
  },

  checkPeriodEnds() {
    const assignments = Timetable.getAll();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const config = Settings.data;
    const engine = new ScheduleEngine(config);

    const current = engine.getCurrentPeriod(assignments, now);
    if (!current) return;

    // Check for 5-minute warning
    if (current.remaining !== undefined && current.remaining === 5) {
      this.sendBrowserNotification(
        '5 Minutes Left',
        `5 minutes left — ${current.subject} ${current.classGroup || ''}`
      );
      this.showToast('5 Minutes Left', `${current.subject} ${current.classGroup || ''} ending soon`, 'warning');
    }
  },

  checkWeekendAlerts() {
    const now = new Date();
    const dayNum = now.getDay();
    const dayKey = dayNum === 6 ? 'Sat' : dayNum === 0 ? 'Sun' : null;
    if (!dayKey) return;

    const activities = Timetable.getWeekend && Timetable.getWeekend(dayKey);
    if (!activities || !activities.length) return;

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    activities.forEach(a => {
      if (!a.time || a._alerted) return;
      if (a.time === currentTime) {
        a._alerted = true;
        this.playSound();
        this.sendBrowserNotification('Activity Now', `${a.name} is starting now!`);
        this.showToast('Activity Now', `${a.name} is starting`, 'period-end');
        // Re-save so _alerted persists across ticks
        try {
          const all = JSON.parse(localStorage.getItem('timetable_weekend')) || {};
          const dayArr = all[dayKey] || [];
          const idx = dayArr.findIndex(x => x.id === a.id);
          if (idx !== -1) { dayArr[idx]._alerted = true; localStorage.setItem('timetable_weekend', JSON.stringify(all)); }
        } catch (e) {}
      }
    });
  },

  resetWeekendAlerts() {
    // Clear _alerted flags on all weekend activities at midnight
    try {
      const all = JSON.parse(localStorage.getItem('timetable_weekend')) || {};
      Object.keys(all).forEach(day => {
        all[day] = all[day].map(a => { delete a._alerted; return a; });
      });
      localStorage.setItem('timetable_weekend', JSON.stringify(all));
    } catch (e) {}
  }
};
