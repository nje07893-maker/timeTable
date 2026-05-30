const express = require('express');
const router = express.Router();
const timetable = require('../models/Timetable');
const ScheduleEngine = require('../utils/scheduleEngine');
const settings = require('../models/Settings');

// GET /api/timetable - all assignments
router.get('/', (req, res) => {
  res.json(timetable.getAll());
});

// GET /api/timetable/day/:day - by day (M, T, W, Th, F)
router.get('/day/:day', (req, res) => {
  const day = req.params.day;
  const valid = ['M', 'T', 'W', 'Th', 'F'];
  if (!valid.includes(day)) {
    return res.status(400).json({ error: 'Invalid day. Use M, T, W, Th, F' });
  }
  res.json(timetable.getByDay(day));
});

// GET /api/timetable/:id
router.get('/:id', (req, res) => {
  const entry = timetable.getById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// POST /api/timetable
router.post('/', (req, res) => {
  const { day, startTime, endTime, subject, classGroup, room, duration, color, periodNumber } = req.body;
  if (!day || !subject) {
    return res.status(400).json({ error: 'day and subject are required' });
  }
  const entry = timetable.create({
    day, startTime, endTime, subject,
    classGroup: classGroup || '',
    room: room || '',
    duration: duration || 40,
    color: color || '#6C5CE7',
    periodNumber: periodNumber || 0,
  });
  res.status(201).json(entry);
});

// PUT /api/timetable/:id
router.put('/:id', (req, res) => {
  const updated = timetable.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// DELETE /api/timetable/:id
router.delete('/:id', (req, res) => {
  const ok = timetable.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// GET /api/timetable/analysis/conflicts
router.get('/analysis/conflicts', (req, res) => {
  const engine = new ScheduleEngine(settings.get());
  const conflicts = engine.detectConflicts(timetable.getAll());
  res.json(conflicts);
});

// GET /api/timetable/analysis/hours
router.get('/analysis/hours', (req, res) => {
  const engine = new ScheduleEngine(settings.get());
  const hours = engine.computeTeachingHours(timetable.getAll());
  res.json(hours);
});

// GET /api/timetable/slots/generate
router.get('/slots/generate', (req, res) => {
  const engine = new ScheduleEngine(settings.get());
  const slots = engine.generateDailySlots();
  res.json(slots);
});

// POST /api/timetable/import
router.post('/import', (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'assignments must be an array' });
  }
  const created = [];
  for (const a of assignments) {
    created.push(timetable.create(a));
  }
  res.status(201).json(created);
});

// GET /api/timetable/export/json
router.get('/export/json', (req, res) => {
  res.json(timetable.getAll());
});

module.exports = router;
