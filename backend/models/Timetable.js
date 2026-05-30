class TimetableModel {
  constructor() {
    this.data = new Map();
    this.initDefault();
  }

  initDefault() {
    const demoData = [
      { id: '1', day: 'M', periodNumber: 5, startTime: '11:00', endTime: '11:40', subject: 'ICT', classGroup: 'S2A', room: 'Lab 2', duration: 40, color: '#4A90D9' },
      { id: '2', day: 'T', periodNumber: 9, startTime: '14:30', endTime: '15:10', subject: 'MATH', classGroup: 'S1A', room: 'Rm 12', duration: 40, color: '#E74C3C' },
      { id: '3', day: 'T', periodNumber: 10, startTime: '15:30', endTime: '16:10', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
      { id: '4', day: 'W', periodNumber: 8, startTime: '13:50', endTime: '14:30', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
      { id: '5', day: 'W', periodNumber: 9, startTime: '14:30', endTime: '15:10', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
      { id: '6', day: 'Th', periodNumber: 2, startTime: '08:40', endTime: '09:20', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
      { id: '7', day: 'Th', periodNumber: 3, startTime: '09:20', endTime: '10:00', subject: 'MATH', classGroup: '', room: '', duration: 40, color: '#E74C3C' },
    ];
    for (const d of demoData) {
      this.data.set(d.id, d);
    }
  }

  getAll() {
    return Array.from(this.data.values());
  }

  getByDay(day) {
    return this.getAll().filter(a => a.day === day);
  }

  getById(id) {
    return this.data.get(id);
  }

  create(assignment) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const entry = { id, ...assignment };
    this.data.set(id, entry);
    return entry;
  }

  update(id, fields) {
    const existing = this.data.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...fields };
    this.data.set(id, updated);
    return updated;
  }

  delete(id) {
    return this.data.delete(id);
  }

  toJSON() {
    return this.getAll();
  }
}

module.exports = new TimetableModel();
