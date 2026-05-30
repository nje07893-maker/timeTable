const DEMO_DATA = [
  { id: 'd1', day: 'M', periodNumber: 5, startTime: '11:00', endTime: '11:40', subject: 'ICT', classGroup: 'S2A', room: 'Lab 2', duration: 40, color: '#4A90D9' },
  { id: 'd2', day: 'T', periodNumber: 9, startTime: '14:30', endTime: '15:10', subject: 'MATH', classGroup: 'S1A', room: 'Rm 12', duration: 40, color: '#E74C3C' },
  { id: 'd3', day: 'T', periodNumber: 10, startTime: '15:30', endTime: '16:10', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
  { id: 'd4', day: 'W', periodNumber: 8, startTime: '13:50', endTime: '14:30', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
  { id: 'd5', day: 'W', periodNumber: 9, startTime: '14:30', endTime: '15:10', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
  { id: 'd6', day: 'Th', periodNumber: 2, startTime: '08:40', endTime: '09:20', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
  { id: 'd7', day: 'Th', periodNumber: 3, startTime: '09:20', endTime: '10:00', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
];

function ScheduleEngine(config) {
  this.schoolStart = config.schoolStart || '08:00';
  this.periodDuration = config.periodDuration || 40;
  this.breakSlots = config.breakSlots || [
    { name: 'Break', start: '10:00', duration: 20 },
    { name: 'Lunch', start: '11:40', duration: 90 },
    { name: 'Afternoon Break', start: '15:10', duration: 20 },
  ];
  this.numPeriods = config.numPeriods || 12;
}

ScheduleEngine.prototype.timeToMinutes = function(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

ScheduleEngine.prototype.minutesToTime = function(m) {
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
};

ScheduleEngine.prototype.generateDailySlots = function() {
  const slots = [];
  let current = this.timeToMinutes(this.schoolStart);
  const endDay = this.timeToMinutes('17:00');
  let periodNum = 1;

  const breakIntervals = this.breakSlots.map(b => ({
    name: b.name,
    start: this.timeToMinutes(b.start),
    end: this.timeToMinutes(b.start) + b.duration,
  }));

  while (current < endDay && periodNum <= this.numPeriods) {
    const inBreak = breakIntervals.find(b => current >= b.start && current < b.end);
    if (inBreak) {
      slots.push({
        type: 'break',
        name: inBreak.name,
        startTime: this.minutesToTime(inBreak.start),
        endTime: this.minutesToTime(inBreak.end),
        periodNumber: null,
      });
      current = inBreak.end;
      continue;
    }

    const nextBreak = breakIntervals.find(b => current < b.end && current + this.periodDuration > b.start);
    let slotEnd;
    if (nextBreak) {
      slotEnd = nextBreak.start;
    } else {
      slotEnd = Math.min(current + this.periodDuration, endDay);
    }

    const duration = slotEnd - current;
    if (duration > 0) {
      slots.push({
        type: 'teaching',
        periodNumber: periodNum,
        startTime: this.minutesToTime(current),
        endTime: this.minutesToTime(slotEnd),
        duration: duration,
      });
      periodNum++;
    }
    current = slotEnd;
  }
  return slots;
};

ScheduleEngine.prototype.getCurrentPeriod = function(assignments, now) {
  const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
  const dayKey = days[now.getDay()];
  if (dayKey === 'SUN' || dayKey === 'S') return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayAssignments = assignments.filter(a => a.day === dayKey);

  for (const a of todayAssignments) {
    if (a.startTime) {
      const start = this.timeToMinutes(a.startTime);
      const end = start + (a.duration || 40);
      if (nowMinutes >= start && nowMinutes < end) {
        return { ...a, remaining: end - nowMinutes };
      }
    }
  }
  return null;
};

ScheduleEngine.prototype.getNextPeriod = function(assignments, now) {
  const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
  const dayKey = days[now.getDay()];
  if (dayKey === 'SUN' || dayKey === 'S') return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayAssignments = assignments
    .filter(a => a.day === dayKey)
    .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

  for (const a of todayAssignments) {
    if (a.startTime) {
      const start = this.timeToMinutes(a.startTime);
      if (nowMinutes < start) {
        return { ...a, minutesUntil: start - nowMinutes };
      }
    }
  }
  return null;
};

const Timetable = {
  data: [],
  nextId: 100,

  load() {
    try {
      const raw = localStorage.getItem('timetable_data');
      if (raw) {
        this.data = JSON.parse(raw);
        // ensure nextId is beyond existing ids
        this.data.forEach(d => {
          const numId = parseInt(d.id);
          if (numId >= this.nextId) this.nextId = numId + 1;
        });
      } else {
        this.data = JSON.parse(JSON.stringify(DEMO_DATA));
        this.save();
      }
    } catch {
      this.data = JSON.parse(JSON.stringify(DEMO_DATA));
      this.save();
    }
    return this.data;
  },

  save() {
    localStorage.setItem('timetable_data', JSON.stringify(this.data));
  },

  getAll() {
    return this.data;
  },

  getByDay(day) {
    return this.data.filter(a => a.day === day);
  },

  getById(id) {
    return this.data.find(a => a.id === id);
  },

  create(entry) {
    const id = String(this.nextId++);
    const newEntry = { id, ...entry };
    this.data.push(newEntry);
    this.save();
    return newEntry;
  },

  update(id, fields) {
    const idx = this.data.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data[idx] = { ...this.data[idx], ...fields };
    this.save();
    return this.data[idx];
  },

  delete(id) {
    const idx = this.data.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.splice(idx, 1);
    this.save();
    return true;
  },

  importData(arr) {
    this.data = arr;
    this.save();
  },

  exportData() {
    return JSON.stringify(this.data, null, 2);
  },

  reset() {
    this.data = JSON.parse(JSON.stringify(DEMO_DATA));
    this.save();
  },

  getSubjectColor(subject) {
    const colors = {
      'MATH': '#E74C3C',
      'ICT': '#4A90D9',
      'ENGLISH': '#2ECC71',
      'SCIENCE': '#9B59B6',
      'HISTORY': '#F39C12',
      'GEOGRAPHY': '#1ABC9C',
      'ART': '#E91E63',
      'MUSIC': '#FF5722',
      'PE': '#8BC34A',
      'FRENCH': '#00BCD4',
      'KISWAHILI': '#795548',
      'BIBLE': '#607D8B',
    };
    if (colors[subject.toUpperCase()]) return colors[subject.toUpperCase()];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
  },

  // ====== WEEKEND ACTIVITIES ======
  _weekendKey: 'timetable_weekend',

  getWeekend(day) {
    const all = this._loadWeekend();
    return all[day] || [];
  },

  addWeekendActivity(day, activity) {
    const all = this._loadWeekend();
    if (!all[day]) all[day] = [];
    activity.id = 'we_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    all[day].push(activity);
    this._saveWeekend(all);
    return activity;
  },

  deleteWeekendActivity(day, id) {
    const all = this._loadWeekend();
    if (!all[day]) return;
    all[day] = all[day].filter(a => a.id !== id);
    this._saveWeekend(all);
  },

  _loadWeekend() {
    try { return JSON.parse(localStorage.getItem(this._weekendKey)) || {}; }
    catch { return {}; }
  },

  _saveWeekend(data) {
    localStorage.setItem(this._weekendKey, JSON.stringify(data));
  }
};
