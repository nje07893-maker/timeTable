const express = require('express');
const router = express.Router();
const users = require('../models/Users');

// Simple in-memory session store
const sessions = new Map();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = users.authenticate(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session token
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  sessions.set(token, { userId: user.id, role: user.role });

  res.json({ token, user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const session = sessions.get(token);
  const user = users.getById(session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ token, user });
});

// Middleware: require auth
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const session = sessions.get(token);
  req.currentUser = users.getById(session.userId);
  req.currentToken = token;
  next();
}

// Middleware: require admin
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  });
}

// ===== Admin-only user management =====

// GET /api/auth/users - list all users (admin only)
router.get('/users', requireAdmin, (req, res) => {
  res.json(users.getAll());
});

// POST /api/auth/users - create user (admin only)
router.post('/users', requireAdmin, (req, res) => {
  const { username, password, name, school, role } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const created = users.create({ username, password, name, school, role });
  if (!created) return res.status(409).json({ error: 'Username already exists' });
  res.status(201).json(created);
});

// PUT /api/auth/users/:id - update user (admin only)
router.put('/users/:id', requireAdmin, (req, res) => {
  const updated = users.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(updated);
});

// DELETE /api/auth/users/:id - delete user (admin only)
router.delete('/users/:id', requireAdmin, (req, res) => {
  const ok = users.delete(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Cannot delete or user not found' });
  res.json({ success: true });
});

// PUT /api/auth/users/:id/reset-password - reset password (admin only)
router.put('/users/:id/reset-password', requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  const updated = users.resetPassword(req.params.id, newPassword || 'password123');
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(updated);
});

// Export middleware for other routes
router.requireAuth = requireAuth;
router.requireAdmin = requireAdmin;

module.exports = router;
