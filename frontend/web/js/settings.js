const Settings = {
  defaults: {
    teacherName: '',
    schoolName: '',
    schoolStart: '08:00',
    periodDuration: 40,
    numPeriods: 12,
    soundEnabled: true,
    notificationEnabled: true,
    alertSound: 'bell',
    darkMode: false,
    breakSlots: [
      { name: 'Break', start: '10:00', duration: 20 },
      { name: 'Lunch', start: '11:40', duration: 90 },
      { name: 'Afternoon Break', start: '15:10', duration: 20 },
    ],
  },

  data: null,

  load() {
    try {
      const raw = localStorage.getItem('timetable_settings');
      this.data = raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch {
      this.data = { ...this.defaults };
    }
    return this.data;
  },

  save() {
    localStorage.setItem('timetable_settings', JSON.stringify(this.data));
  },

  get(key) {
    return this.data ? this.data[key] : this.defaults[key];
  },

  set(key, value) {
    if (this.data) this.data[key] = value;
  },

  update(fields) {
    Object.assign(this.data, fields);
    this.save();
  },

  applyUI() {
    document.getElementById('set-teacher').value = this.get('teacherName') || '';
    document.getElementById('set-school').value = this.get('schoolName') || '';
    document.getElementById('set-start').value = this.get('schoolStart') || '08:00';
    document.getElementById('set-duration').value = this.get('periodDuration') || 40;
    document.getElementById('set-periods').value = this.get('numPeriods') || 12;
    document.getElementById('set-sound').checked = this.get('soundEnabled');
    document.getElementById('set-notifications').checked = this.get('notificationEnabled');
    document.getElementById('set-sound-type').value = this.get('alertSound') || 'bell';
    document.getElementById('set-darkmode').checked = this.get('darkMode') || false;
  },

  readFromUI() {
    return {
      teacherName: document.getElementById('set-teacher').value,
      schoolName: document.getElementById('set-school').value,
      schoolStart: document.getElementById('set-start').value,
      periodDuration: parseInt(document.getElementById('set-duration').value) || 40,
      numPeriods: parseInt(document.getElementById('set-periods').value) || 12,
      soundEnabled: document.getElementById('set-sound').checked,
      notificationEnabled: document.getElementById('set-notifications').checked,
      alertSound: document.getElementById('set-sound-type').value,
      darkMode: document.getElementById('set-darkmode').checked,
    };
  },

  applyTheme() {
    if (this.get('darkMode')) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
};
