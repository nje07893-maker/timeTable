class ScheduleEngine {
  constructor(config = {}) {
    this.schoolStart = config.schoolStart || '08:00';
    this.periodDuration = config.periodDuration || 40;
    this.breakSlots = config.breakSlots || [
      { name: 'Break', start: '10:00', duration: 20 },
      { name: 'Lunch', start: '11:40', duration: 90 },
      { name: 'Afternoon Break', start: '15:10', duration: 20 },
    ];
    this.numPeriods = config.numPeriods || 12;
  }

  timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  minutesToTime(m) {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
  }

  generateDailySlots() {
    const slots = [];
    let current = this.timeToMinutes(this.schoolStart);
    const endDay = this.timeToMinutes('17:00');
    let periodNum = 1;

    // Build break intervals in minutes
    const breakIntervals = this.breakSlots.map(b => ({
      name: b.name,
      start: this.timeToMinutes(b.start),
      end: this.timeToMinutes(b.start) + b.duration,
    }));

    while (current < endDay && periodNum <= this.numPeriods) {
      // Check if current time falls within a break
      const inBreak = breakIntervals.find(b => current >= b.start && current < b.end);
      if (inBreak) {
        slots.push({
          type: 'break',
          name: inBreak.name,
          startTime: this.minutesToTime(inBreak.start),
          endTime: this.minutesToTime(inBreak.end),
          duration: inBreak.end - inBreak.start,
          periodNumber: null,
        });
        current = inBreak.end;
        continue;
      }

      // Check if slot would overlap with break
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
  }

  detectConflicts(assignments) {
    const conflicts = [];
    const daySlots = { M: [], T: [], W: [], Th: [], F: [] };

    for (const a of assignments) {
      daySlots[a.day] = daySlots[a.day] || [];
      daySlots[a.day].push(a);
    }

    for (const [day, slots] of Object.entries(daySlots)) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i];
          const b = slots[j];
          if (a.startTime && a.endTime && b.startTime && b.endTime) {
            const aStart = this.timeToMinutes(a.startTime);
            const aEnd = aStart + (a.duration || 40);
            const bStart = this.timeToMinutes(b.startTime);
            const bEnd = bStart + (b.duration || 40);
            if (aStart < bEnd && bStart < aEnd) {
              conflicts.push({
                day,
                subject1: a.subject,
                subject2: b.subject,
                time1: a.startTime,
                time2: b.startTime,
                message: `Overlap on ${day}: "${a.subject}" (${a.startTime}) and "${b.subject}" (${b.startTime})`,
              });
            }
          }
        }
      }
    }
    return conflicts;
  }

  getCurrentPeriod(assignments, now = new Date()) {
    const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
    const dayKey = days[now.getDay()];
    if (dayKey === 'SUN' || dayKey === 'S') return null;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayAssignments = assignments.filter(a => a.day === dayKey);

    for (const a of todayAssignments) {
      if (a.startTime && a.endTime) {
        const start = this.timeToMinutes(a.startTime);
        const end = start + (a.duration || 40);
        if (nowMinutes >= start && nowMinutes < end) {
          return { ...a, remaining: end - nowMinutes };
        }
      }
    }
    return null;
  }

  getNextPeriod(assignments, now = new Date()) {
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
  }

  computeTeachingHours(assignments) {
    const hours = {};
    for (const a of assignments) {
      if (a.subject) {
        hours[a.subject] = (hours[a.subject] || 0) + (a.duration || 40);
      }
    }
    // Convert minutes to hours
    for (const k of Object.keys(hours)) {
      hours[k] = Math.round((hours[k] / 60) * 10) / 10;
    }
    return hours;
  }
}

module.exports = ScheduleEngine;
