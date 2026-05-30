class SettingsModel {
  constructor() {
    this.settings = {
      schoolStart: '08:00',
      periodDuration: 40,
      numPeriods: 12,
      teacherName: 'Mr. Johnson',
      schoolName: 'Springfield High',
      soundEnabled: true,
      notificationEnabled: true,
      alertSound: 'bell',
      breakSlots: [
        { name: 'Break', start: '10:00', duration: 20 },
        { name: 'Lunch', start: '11:40', duration: 90 },
        { name: 'Afternoon Break', start: '15:10', duration: 20 },
      ],
      darkMode: false,
    };
  }

  get() {
    return { ...this.settings };
  }

  update(fields) {
    Object.assign(this.settings, fields);
    return this.get();
  }
}

module.exports = new SettingsModel();
