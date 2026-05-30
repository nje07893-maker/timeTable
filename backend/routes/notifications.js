const express = require('express');
const router = express.Router();

// In-memory notification log
const notificationLog = [];

// POST /api/notifications/send
router.post('/send', (req, res) => {
  const { type, title, body, subject, classGroup, room } = req.body;
  const notif = {
    id: Date.now().toString(36),
    type: type || 'info',
    title: title || '',
    body: body || '',
    subject: subject || '',
    classGroup: classGroup || '',
    room: room || '',
    timestamp: new Date().toISOString(),
    read: false,
  };
  notificationLog.unshift(notif);
  // Keep last 100
  if (notificationLog.length > 100) notificationLog.length = 100;

  // Broadcast via WebSocket if server has it
  const wss = req.app.get('wss');
  if (wss) {
    const payload = JSON.stringify({ type: 'notification', data: notif });
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(payload);
    });
  }

  res.status(201).json(notif);
});

// GET /api/notifications/history
router.get('/history', (req, res) => {
  res.json(notificationLog);
});

// PUT /api/notifications/read/:id
router.put('/read/:id', (req, res) => {
  const n = notificationLog.find(item => item.id === req.params.id);
  if (n) n.read = true;
  res.json({ success: true });
});

module.exports = router;
