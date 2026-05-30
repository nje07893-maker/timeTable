const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const cron = require('node-cron');

const timetableRoutes = require('./routes/timetable');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');
const ScheduleEngine = require('./utils/scheduleEngine');
const settings = require('./models/Settings');
const timetable = require('./models/Timetable');

const app = express();
const server = http.createServer(app);

// WebSocket
const wss = new WebSocketServer({ server });
app.set('wss', wss);

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Timetable server connected' }));

  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// Middleware
app.use(cors());
app.use(express.json());

// Static files - serve web frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'web')));

// Routes
app.use('/api/timetable', timetableRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Schedule check every 30 seconds
setInterval(() => {
  const config = settings.get();
  const engine = new ScheduleEngine(config);
  const now = new Date();
  const current = engine.getCurrentPeriod(timetable.getAll(), now);
  const next = engine.getNextPeriod(timetable.getAll(), now);

  // Broadcast current state
  const payload = JSON.stringify({
    type: 'schedule-update',
    data: { current, next, time: now.toISOString() }
  });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}, 30000);

// Cron: check every minute for period-end alerts
cron.schedule('* * * * *', () => {
  const config = settings.get();
  const engine = new ScheduleEngine(config);
  const now = new Date();
  const current = engine.getCurrentPeriod(timetable.getAll(), now);

  if (current && current.remaining !== undefined) {
    // 5-minute warning
    if (current.remaining === 5) {
      const payload = JSON.stringify({
        type: 'notification',
        data: {
          type: 'warning',
          title: '5 Minutes Left',
          body: `5 minutes left — ${current.subject} ${current.classGroup || ''}`,
          subject: current.subject,
          classGroup: current.classGroup,
        }
      });
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
      });
    }

    // Period ended
    if (current.remaining <= 0) {
      const next = engine.getNextPeriod(timetable.getAll(), now);
      const payload = JSON.stringify({
        type: 'notification',
        data: {
          type: 'period-end',
          title: 'Period Ended',
          body: `Period ended — ${current.subject} ${current.classGroup || ''} is done`,
          subject: current.subject,
          classGroup: current.classGroup,
          nextSubject: next ? next.subject : 'End of day',
          nextTime: next ? next.startTime : '---',
        }
      });
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
      });
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Teacher Timetable Server running on http://localhost:${PORT}`);
  console.log(`Web app: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/timetable`);
});
