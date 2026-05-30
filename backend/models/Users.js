const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'users.json');

function readFile() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeFile(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

class UsersModel {
  constructor() {
    this.nextId = 10;
    this._ensureDefaults();
  }

  _ensureDefaults() {
    let data = readFile();
    if (!data || !Array.isArray(data.users) || data.users.length === 0) {
      data = {
        users: [
          { id: '1', username: 'jeremie', password: '123', name: 'Jeremie Admin', role: 'admin', school: 'Springfield High', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: '2', username: 'teacher1', password: 'teacher1', name: 'Mr. Johnson', role: 'teacher', school: 'Springfield High', createdAt: '2026-01-15T00:00:00.000Z' },
        ],
      };
    }
    const maxId = data.users.reduce((m, u) => Math.max(m, parseInt(u.id) || 0), 0);
    this.nextId = Math.max(maxId + 1, 10);
    writeFile(data);
  }

  _data() {
    return readFile() || { users: [] };
  }

  _save(data) {
    writeFile(data);
  }

  getAll() {
    return this._data().users.map(({ password, ...u }) => u);
  }

  getById(id) {
    const data = this._data();
    const u = data.users.find(u => u.id === id);
    if (!u) return null;
    const { password, ...safe } = u;
    return safe;
  }

  getByUsername(username) {
    const data = this._data();
    return data.users.find(u => u.username === username);
  }

  authenticate(username, password) {
    const data = this._data();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (!user) return null;
    const { password: _, ...safe } = user;
    return safe;
  }

  create({ username, password, name, school, role }) {
    const data = this._data();
    const existing = data.users.find(u => u.username === username);
    if (existing) return null;
    const id = String(this.nextId++);
    const user = {
      id, username,
      password: password || 'password123',
      name: name || '',
      school: school || '',
      role: role || 'teacher',
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    this._save(data);
    const { password: _, ...safe } = user;
    return safe;
  }

  update(id, fields) {
    const data = this._data();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(data.users[idx], fields);
    this._save(data);
    const { password: _, ...safe } = data.users[idx];
    return safe;
  }

  delete(id) {
    const data = this._data();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    if (data.users[idx].role === 'admin') return false;
    data.users.splice(idx, 1);
    this._save(data);
    return true;
  }

  resetPassword(id, newPassword) {
    const data = this._data();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    data.users[idx].password = newPassword || 'password123';
    this._save(data);
    const { password: _, ...safe } = data.users[idx];
    return safe;
  }
}

module.exports = new UsersModel();
