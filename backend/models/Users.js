class UsersModel {
  constructor() {
    this.users = [
      {
        id: '1',
        username: 'jeremie',
        password: '123',
        name: 'Jeremie Admin',
        role: 'admin',
        school: 'Springfield High',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        username: 'teacher1',
        password: 'teacher1',
        name: 'Mr. Johnson',
        role: 'teacher',
        school: 'Springfield High',
        createdAt: '2026-01-15T00:00:00.000Z',
      },
    ];
    this.nextId = 10;
  }

  getAll() {
    return this.users.map(({ password, ...u }) => u); // strip passwords
  }

  getById(id) {
    const u = this.users.find(u => u.id === id);
    if (!u) return null;
    const { password, ...safe } = u;
    return safe;
  }

  getByUsername(username) {
    return this.users.find(u => u.username === username);
  }

  authenticate(username, password) {
    const user = this.users.find(u => u.username === username && u.password === password);
    if (!user) return null;
    const { password: _, ...safe } = user;
    return safe;
  }

  create({ username, password, name, school, role }) {
    const existing = this.users.find(u => u.username === username);
    if (existing) return null;
    const id = String(this.nextId++);
    const user = {
      id,
      username,
      password: password || 'password123',
      name: name || '',
      school: school || '',
      role: role || 'teacher',
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    const { password: _, ...safe } = user;
    return safe;
  }

  update(id, fields) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(this.users[idx], fields);
    const { password: _, ...safe } = this.users[idx];
    return safe;
  }

  delete(id) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    if (this.users[idx].role === 'admin') return false; // cannot delete admin
    this.users.splice(idx, 1);
    return true;
  }

  resetPassword(id, newPassword) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx].password = newPassword || 'password123';
    const { password: _, ...safe } = this.users[idx];
    return safe;
  }

  toJSON() {
    return this.users.map(({ password, ...u }) => u);
  }
}

module.exports = new UsersModel();
