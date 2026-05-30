// ====== CUSTOM CONFIRM DIALOG ======
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-box">
        <div class="dialog-title">${title}</div>
        <div class="dialog-message">${message}</div>
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn-danger" data-action="confirm">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('[data-action="confirm"]').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

// ====== TOAST HELPER ======
function showToast(title, body, type) {
  const toast = document.getElementById('notification-toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-body').textContent = body;
  const colors = { warning: '#f59e0b', 'period-end': '#ef4444', info: '#10b981' };
  toast.style.borderLeftColor = colors[type] || colors.info;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 5000);
}

// ====== AUTH MODULE ======
const Auth = {
  token: null,
  user: null,
  users: [],

  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_user', JSON.stringify(this.user));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: this._headers() });
    } catch {}
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  async checkSession() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    if (!token || !user) return false;
    this.token = token;
    this.user = JSON.parse(user);
    // Verify with server
    try {
      const res = await fetch('/api/auth/me', { headers: this._headers() });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_user', JSON.stringify(this.user));
      return true;
    } catch {
      await this.logout();
      return false;
    }
  },

  isAdmin() { return this.user?.role === 'admin'; },
  isTeacher() { return this.user?.role === 'teacher'; },

  async fetchUsers() {
    const res = await fetch('/api/auth/users', { headers: this._headers() });
    if (!res.ok) return [];
    this.users = await res.json();
    return this.users;
  },

  async createUser(data) {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok ? { ok: true, user: await res.json() } : { ok: false, error: (await res.json()).error };
  },

  async deleteUser(id) {
    const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE', headers: this._headers() });
    return res.ok;
  },

  async updateUser(id, data) {
    const res = await fetch(`/api/auth/users/${id}`, {
      method: 'PUT',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }
};

// ====== APP CONTROLLER ======
const App = {
  currentView: 'home',
  currentDay: 'M',
  selectedPeriodId: null,
  _tickTimer: null,

  async init() {
    await Auth.checkSession();
    document.getElementById('logout-btn').style.display = Auth.user ? '' : 'none';
    this._bootApp();
  },

  async _bootApp() {
    // Show/hide admin nav button
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = Auth.isAdmin() ? '' : 'none';
    });

    // Show username in header
    const info = document.getElementById('user-info');
    if (Auth.user) {
      info.textContent = `${Auth.user.name || Auth.user.username} (${Auth.user.role})`;
    } else {
      info.textContent = 'Not signed in';
    }

    // Settings login/logout section
    this._bindSettingsLogin();

    // Load data
    Settings.load();
    Timetable.load();
    Notifications.init();
    Settings.applyTheme();
    this.updateHeader();

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    // Day tabs
    document.querySelectorAll('.day-tab').forEach(tab => {
      tab.addEventListener('click', () => this.selectDay(tab.dataset.day));
    });

    this._initDayCarousel();

    // Logout in header
    document.getElementById('logout-btn').style.display = Auth.user ? '' : 'none';
    document.getElementById('logout-btn').addEventListener('click', async () => {
      if (!Auth.user) return;
      const ok = await showConfirm('Sign Out', 'Are you sure you want to sign out?');
      if (!ok) return;
      await Auth.logout();
      this._updateSettingsLoginUI();
      document.getElementById('logout-btn').style.display = 'none';
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
      document.getElementById('user-info').textContent = 'Not signed in';
      showToast('Signed Out', 'You have been signed out', 'info');
    });

    // Form
    document.getElementById('add-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('add-clear-btn').addEventListener('click', () => this.clearForm());

    document.getElementById('add-subject').addEventListener('input', (e) => {
      const preview = document.getElementById('add-save-btn');
      preview.style.background = e.target.value.trim() ? Timetable.getSubjectColor(e.target.value.trim()) : '';
    });

    // Settings
    document.getElementById('set-save-btn').addEventListener('click', () => this.saveSettings());
    document.getElementById('set-darkmode').addEventListener('change', (e) => {
      document.body.classList.toggle('dark', e.target.checked);
    });

    // Data
    document.getElementById('export-json-btn').addEventListener('click', () => this.exportJSON());
    document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => this.importJSON(e));
    document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPDF());
    document.getElementById('reset-data-btn').addEventListener('click', () => this.resetData());

    // Admin
    if (Auth.isAdmin()) {
      document.getElementById('admin-user-form').addEventListener('submit', (e) => this.adminCreateUser(e));
      this.adminLoadUsers();
    }

    // Modal
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-edit-btn').addEventListener('click', () => this.editFromModal());
    document.getElementById('modal-delete-btn').addEventListener('click', () => this.deleteFromModal());
    document.getElementById('period-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.closeModal(); }
      if (e.key >= '1' && e.key <= '5') {
        this.selectDay(['M', 'T', 'W', 'Th', 'F'][parseInt(e.key) - 1]);
        this.switchView('week');
      }
      if (e.key === 'h' || e.key === 'H') this.switchView('home');
      if (e.key === 'w' || e.key === 'W') this.switchView('week');
      if (e.key === 'a' || e.key === 'A') { this.switchView('add'); this.clearForm(); }
      if (e.key === 's' || e.key === 'S') this.switchView('settings');
      if ((e.key === 'u' || e.key === 'U') && Auth.isAdmin()) { this.switchView('admin'); this.adminLoadUsers(); }
    });

    // Renders
    this.renderHome();
    this.renderWeekGrid();
    this.startClock();
    this.startLiveCountdown();
  },

  selectDay(day) {
    this.currentDay = day;
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.day-tab[data-day="${day}"]`);
    if (tab) tab.classList.add('active');
    this.renderWeekGrid();
    const carousel = document.getElementById('day-carousel');
    if (carousel) {
      const panels = carousel.querySelectorAll('.day-panel');
      const idx = ['M', 'T', 'W', 'Th', 'F'].indexOf(day);
      if (idx >= 0 && panels[idx]) panels[idx].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  },

  _initDayCarousel() {
    const carousel = document.getElementById('day-carousel');
    if (!carousel) return;
    carousel.addEventListener('scroll', () => {
      const panels = carousel.querySelectorAll('.day-panel');
      const days = ['M', 'T', 'W', 'Th', 'F'];
      let cd = this.currentDay, closest = Infinity;
      const center = carousel.scrollLeft + carousel.clientWidth / 2;
      panels.forEach((p, i) => {
        const d = Math.abs(p.offsetLeft - center + p.offsetWidth / 2);
        if (d < closest) { closest = d; cd = days[i]; }
      });
      if (cd !== this.currentDay) {
        this.currentDay = cd;
        document.querySelectorAll('.day-tab').forEach(t => t.classList.toggle('active', t.dataset.day === cd));
      }
    });
  },

  switchView(view) {
    if (this.currentView === view) return;
    this.currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-view="${view}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');
    if (view === 'home') this.renderHome();
    if (view === 'week') this.renderWeekGrid();
    if (view === 'admin') this.adminLoadUsers();
  },

  _bindSettingsLogin() {
    document.getElementById('settings-login-btn').addEventListener('click', () => this._handleSettingsLogin());
    document.getElementById('settings-login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSettingsLogin();
    });
    document.getElementById('settings-logout-btn').addEventListener('click', async () => {
      await Auth.logout();
      this._updateSettingsLoginUI();
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
      document.getElementById('user-info').textContent = 'Not signed in';
      showToast('Signed Out', 'You have been signed out', 'info');
    });
    this._updateSettingsLoginUI();
  },

  _updateSettingsLoginUI() {
    const loginSection = document.getElementById('settings-login-section');
    const loggedinSection = document.getElementById('settings-loggedin-section');
    if (Auth.user) {
      loginSection.classList.add('hidden');
      loggedinSection.classList.remove('hidden');
      document.getElementById('settings-user-display').textContent =
        `${Auth.user.name || Auth.user.username} (${Auth.user.role})`;
    } else {
      loginSection.classList.remove('hidden');
      loggedinSection.classList.add('hidden');
    }
  },

  async _handleSettingsLogin() {
    const username = document.getElementById('settings-login-username').value.trim();
    const password = document.getElementById('settings-login-password').value;
    const errorEl = document.getElementById('settings-login-error');
    const btn = document.getElementById('settings-login-btn');

    errorEl.textContent = '';
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    const result = await Auth.login(username, password);
    btn.textContent = 'Sign In';
    btn.disabled = false;

    if (result.ok) {
      this._updateSettingsLoginUI();
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = Auth.isAdmin() ? '' : 'none';
      });
      document.getElementById('user-info').textContent =
        `${Auth.user.name || Auth.user.username} (${Auth.user.role})`;
      showToast('Signed In', `Welcome, ${Auth.user.name || Auth.user.username}`, 'info');
      document.getElementById('settings-login-username').value = '';
      document.getElementById('settings-login-password').value = '';
      if (Auth.isAdmin()) this.adminLoadUsers();
    } else {
      errorEl.textContent = result.error || 'Invalid credentials';
    }
  },

  updateHeader() {
    const teacher = Settings.get('teacherName');
    const school = Settings.get('schoolName');
    const info = document.getElementById('user-info');
    if (Auth.user) {
      const name = teacher || Auth.user.name || Auth.user.username;
      info.textContent = school ? `${name} · ${school}` : name;
    } else {
      info.textContent = 'Not signed in';
    }
  },

  startClock() {
    const update = () => {
      document.getElementById('clock-display').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    update();
    setInterval(update, 10000);
  },

  startLiveCountdown() {
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = setInterval(() => this.renderHome(), 1000);
  },

  // ====== HOME ======
  renderHome() {
    const now = new Date();
    const days = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'];
    const dayKey = days[now.getDay()];
    const config = Settings.data;
    const engine = new ScheduleEngine(config);
    const assignments = Timetable.getAll();
    const current = engine.getCurrentPeriod(assignments, now);
    const next = engine.getNextPeriod(assignments, now);

    const currentEl = document.getElementById('current-period-info');
    const countdownEl = document.getElementById('countdown-timer');
    if (current) {
      currentEl.innerHTML = `<strong>${current.subject}</strong> ${current.classGroup || ''}${current.room ? ' · ' + current.room : ''}`;
      countdownEl.textContent = this.formatCountdown(current.remaining);
      countdownEl.className = 'countdown' + (current.remaining <= 5 ? ' warning' : '');
    } else {
      currentEl.textContent = next ? 'Between periods' : 'No classes now';
      countdownEl.textContent = '--:--';
      countdownEl.className = 'countdown';
    }

    const nextEl = document.getElementById('next-period-info');
    const nextCountdown = document.getElementById('next-countdown');
    if (next) {
      nextEl.innerHTML = `<strong>${next.subject}</strong> ${next.classGroup || ''} at ${next.startTime}`;
      nextCountdown.textContent = next.minutesUntil !== undefined ? this.formatCountdown(next.minutesUntil) : '--:--';
      nextCountdown.className = 'countdown small' + (next.minutesUntil !== undefined && next.minutesUntil <= 2 ? ' warning' : '');
    } else {
      nextEl.textContent = 'End of day';
      nextCountdown.textContent = '--:--';
      nextCountdown.className = 'countdown small';
    }

    document.getElementById('home-day-title').textContent = `${this.getDayName(dayKey)}'s Schedule`;
    const scheduleList = document.getElementById('day-schedule-list');
    scheduleList.innerHTML = '';
    const slots = engine.generateDailySlots();

    if (dayKey === 'SUN' || dayKey === 'S') {
      scheduleList.innerHTML = '<p class="text-muted text-center" style="padding:40px 0;">No classes today — enjoy your weekend!</p>';
      return;
    }

    const dayAssignments = assignments.filter(a => a.day === dayKey);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    slots.forEach(slot => {
      const div = document.createElement('div');
      div.className = 'day-schedule-slot';
      const timeSpan = document.createElement('span');
      timeSpan.className = 'slot-time';
      timeSpan.textContent = slot.startTime;
      div.appendChild(timeSpan);

      if (slot.type === 'break') {
        div.classList.add('break-slot');
        const badge = document.createElement('span'); badge.className = 'slot-badge'; badge.style.background = '#f59e0b'; badge.textContent = 'BREAK'; div.appendChild(badge);
        const info = document.createElement('span'); info.className = 'slot-info'; info.innerHTML = `<span class="slot-subject">${slot.name}</span>`; div.appendChild(info);
      } else {
        const matched = dayAssignments.find(a => a.startTime === slot.startTime);
        const timeStart = this.timeToMinutes(slot.startTime);
        if (matched) {
          if (nowMinutes >= timeStart && nowMinutes < timeStart + slot.duration) div.classList.add('active-period');
          const badge = document.createElement('span'); badge.className = 'slot-badge'; badge.style.background = matched.color || Timetable.getSubjectColor(matched.subject); badge.textContent = matched.subject; div.appendChild(badge);
          const info = document.createElement('span'); info.className = 'slot-info'; info.innerHTML = `<span class="slot-subject">${matched.subject}</span> <span class="slot-class">${matched.classGroup || ''}${matched.room ? ' · ' + matched.room : ''}</span>`; div.appendChild(info);
          div.addEventListener('click', () => this.openModal(matched.id));
        } else {
          div.classList.add('empty-slot');
          const badge = document.createElement('span'); badge.className = 'slot-badge'; badge.style.background = 'transparent'; badge.style.color = 'var(--text-secondary)'; badge.textContent = 'Empty'; div.appendChild(badge);
          const info = document.createElement('span'); info.className = 'slot-info'; info.innerHTML = `<span class="slot-class">${slot.startTime} - ${slot.endTime}</span>`; div.appendChild(info);
          const addIcon = document.createElement('span'); addIcon.className = 'add-icon'; addIcon.textContent = '+'; div.appendChild(addIcon);
          div.addEventListener('click', () => { this.switchView('add'); this.populateForm({ day: dayKey, startTime: slot.startTime, duration: slot.duration }); });
        }
      }
      scheduleList.appendChild(div);
    });
  },

  // ====== WEEK ======
  renderWeekGrid() {
    const config = Settings.data;
    const engine = new ScheduleEngine(config);
    const slots = engine.generateDailySlots();
    const assignments = Timetable.getAll();
    const days = ['M', 'T', 'W', 'Th', 'F'];
    const now = new Date();
    const nowDayKey = ['SUN', 'M', 'T', 'W', 'Th', 'F', 'S'][now.getDay()];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    function makeCell(slot, day) {
      const cell = document.createElement('div'); cell.className = 'period-cell';
      if (slot.type === 'break') { cell.classList.add('break-row'); cell.textContent = slot.name; return cell; }
      const matched = assignments.find(a => a.day === day && a.startTime === slot.startTime);
      if (matched) {
        cell.classList.add('filled'); cell.style.background = matched.color || Timetable.getSubjectColor(matched.subject);
        cell.innerHTML = `<div class="period-subject">${matched.subject}</div><div class="period-class">${matched.classGroup || ''}</div>`;
        if (day === nowDayKey) { const sMin = App.timeToMinutes(slot.startTime); if (nowMinutes >= sMin && nowMinutes < sMin + slot.duration) cell.classList.add('active-highlight'); }
        cell.addEventListener('click', () => App.openModal(matched.id));
      } else {
        cell.classList.add('empty-cell'); cell.textContent = '+';
        cell.addEventListener('click', () => { App.switchView('add'); App.populateForm({ day, startTime: slot.startTime, duration: slot.duration }); });
      }
      return cell;
    }

    // Desktop table
    const tbody = document.getElementById('week-grid-body');
    if (tbody) {
      tbody.innerHTML = '';
      slots.forEach(slot => {
        const tr = document.createElement('tr');
        const tdNum = document.createElement('td'); tdNum.className = 'time-col'; tdNum.textContent = slot.periodNumber || ''; tr.appendChild(tdNum);
        const tdTime = document.createElement('td'); tdTime.className = 'time-col time-label'; tdTime.textContent = slot.startTime; tr.appendChild(tdTime);
        days.forEach(day => { const td = document.createElement('td'); td.appendChild(makeCell(slot, day)); tr.appendChild(td); });
        tbody.appendChild(tr);
      });
    }

    // Mobile carousel
    const dayCarousel = document.getElementById('day-carousel');
    if (dayCarousel) {
      dayCarousel.innerHTML = '';
      days.forEach(day => {
        const panel = document.createElement('div'); panel.className = 'day-panel';
        const h4 = document.createElement('h4'); h4.style.cssText = 'font-size:0.9rem;font-weight:600;margin-bottom:8px;color:var(--text);'; h4.textContent = App.getDayName(day); panel.appendChild(h4);
        const table = document.createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.75rem;';
        slots.forEach(slot => {
          const tr = document.createElement('tr');
          const tdNum = document.createElement('td'); tdNum.style.cssText = 'width:24px;text-align:center;color:var(--text-secondary);padding:3px;border:1px solid var(--border);font-size:0.6rem;'; tdNum.textContent = slot.periodNumber || ''; tr.appendChild(tdNum);
          const tdTime = document.createElement('td'); tdTime.style.cssText = 'width:44px;text-align:center;color:var(--text-secondary);padding:3px;border:1px solid var(--border);font-size:0.6rem;'; tdTime.textContent = slot.startTime; tr.appendChild(tdTime);
          const td = document.createElement('td'); td.style.cssText = 'padding:3px;border:1px solid var(--border);height:44px;'; td.appendChild(makeCell(slot, day)); tr.appendChild(td);
          table.appendChild(tr);
        });
        panel.appendChild(table); dayCarousel.appendChild(panel);
      });
      const ci = days.indexOf(this.currentDay);
      if (ci >= 0) { const ps = dayCarousel.querySelectorAll('.day-panel'); if (ps[ci]) ps[ci].scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' }); }
    }
  },

  // ====== ADD/EDIT ======
  handleFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const data = {
      day: document.getElementById('add-day').value,
      subject: document.getElementById('add-subject').value.trim().toUpperCase(),
      classGroup: document.getElementById('add-class').value.trim(),
      room: document.getElementById('add-room').value.trim(),
      startTime: document.getElementById('add-start').value,
      duration: parseInt(document.getElementById('add-duration').value) || 40,
    };
    if (!data.subject) { document.getElementById('add-error').textContent = 'Subject name is required'; return; }
    document.getElementById('add-error').textContent = '';
    data.endTime = this.calculateEndTime(data.startTime, data.duration);
    data.color = Timetable.getSubjectColor(data.subject);
    if (editId) { Timetable.update(editId, data); showToast('Updated', `${data.subject} has been updated`, 'info'); }
    else { Timetable.create(data); showToast('Added', `${data.subject} added to ${this.getDayName(data.day)}`, 'info'); }
    this.clearForm(); this.switchView('home'); this.renderHome(); this.renderWeekGrid();
  },

  populateForm(data) {
    document.getElementById('edit-id').value = '';
    document.getElementById('add-title').textContent = 'Add Period';
    document.getElementById('add-save-btn').textContent = 'Save';
    document.getElementById('add-save-btn').style.background = '';
    document.getElementById('add-error').textContent = '';
    if (data.day) document.getElementById('add-day').value = data.day;
    if (data.startTime) document.getElementById('add-start').value = data.startTime;
    if (data.duration) document.getElementById('add-duration').value = data.duration;
    if (data.subject) {
      document.getElementById('add-subject').value = data.subject;
      document.getElementById('add-title').textContent = 'Edit Period';
      document.getElementById('add-save-btn').textContent = 'Update';
      document.getElementById('add-save-btn').style.background = data.color || Timetable.getSubjectColor(data.subject);
      document.getElementById('edit-id').value = data.id;
    }
    if (data.classGroup) document.getElementById('add-class').value = data.classGroup;
    if (data.room) document.getElementById('add-room').value = data.room;
  },

  clearForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('add-title').textContent = 'Add Period';
    document.getElementById('add-save-btn').textContent = 'Save';
    document.getElementById('add-save-btn').style.background = '';
    document.getElementById('add-error').textContent = '';
    document.getElementById('add-subject').value = '';
    document.getElementById('add-class').value = '';
    document.getElementById('add-room').value = '';
    document.getElementById('add-start').value = Settings.get('schoolStart') || '08:00';
    document.getElementById('add-duration').value = Settings.get('periodDuration') || 40;
  },

  // ====== MODAL ======
  openModal(id) {
    const entry = Timetable.getById(id);
    if (!entry) return;
    this.selectedPeriodId = id;
    document.getElementById('modal-title').textContent = entry.subject;
    document.getElementById('modal-body').innerHTML = `
      <p><strong>Day:</strong> ${this.getDayName(entry.day)}</p>
      <p><strong>Time:</strong> ${entry.startTime} - ${entry.endTime || this.calculateEndTime(entry.startTime, entry.duration)}</p>
      <p><strong>Class:</strong> ${entry.classGroup || '—'}</p>
      <p><strong>Room:</strong> ${entry.room || '—'}</p>
      <p><strong>Duration:</strong> ${entry.duration} min</p>
      <p><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${entry.color || '#6C5CE7'};vertical-align:middle;margin-right:6px"></span> ${entry.color || 'Default'}</p>`;
    document.getElementById('modal-edit-btn').style.background = entry.color || '#4A6CF7';
    document.getElementById('period-modal').classList.remove('hidden');
  },

  closeModal() { document.getElementById('period-modal').classList.add('hidden'); this.selectedPeriodId = null; },
  editFromModal() { const e = Timetable.getById(this.selectedPeriodId); if (!e) return; this.closeModal(); this.switchView('add'); this.populateForm(e); },

  async deleteFromModal() {
    if (!this.selectedPeriodId) return;
    if (!await showConfirm('Delete Period', 'Are you sure?')) return;
    const entry = Timetable.getById(this.selectedPeriodId);
    Timetable.delete(this.selectedPeriodId);
    this.closeModal(); this.renderHome(); this.renderWeekGrid();
    showToast('Deleted', `${entry.subject} removed`, 'period-end');
  },

  // ====== SETTINGS ======
  saveSettings() {
    const fields = Settings.readFromUI();
    Settings.update(fields);
    Settings.applyTheme();
    this.updateHeader();
    this.renderHome();
    this.renderWeekGrid();
    showToast('Saved', 'Settings updated', 'info');
  },

  // ====== DATA ======
  exportJSON() {
    const blob = new Blob([Timetable.exportData()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timetable_backup.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Exported', 'Timetable JSON downloaded', 'info');
  },

  importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) { Timetable.importData(data); this.renderHome(); this.renderWeekGrid(); showToast('Imported', 'Data imported', 'info'); }
        else showToast('Error', 'Invalid JSON', 'period-end');
      } catch { showToast('Error', 'Failed to parse', 'period-end'); }
    };
    reader.readAsText(file); e.target.value = '';
  },

  exportPDF() { window.print(); showToast('Printing', 'Use browser print → Save as PDF', 'info'); },

  async resetData() {
    if (!await showConfirm('Reset Data', 'Delete all entries and restore demo data?')) return;
    Timetable.reset(); this.renderHome(); this.renderWeekGrid();
    showToast('Reset', 'Demo data restored', 'info');
  },

  // ====== ADMIN ======
  async adminLoadUsers() {
    if (!Auth.isAdmin()) return;
    await Auth.fetchUsers();
    const container = document.getElementById('admin-users-list');
    if (!Auth.users.length) { container.innerHTML = '<p class="text-muted">No users found</p>'; return; }

    let html = '<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">';
    html += '<tr style="background:var(--bg);font-weight:600;"><th style="padding:8px 6px;border:1px solid var(--border);text-align:left;">Username</th><th style="padding:8px 6px;border:1px solid var(--border);text-align:left;">Name</th><th style="padding:8px 6px;border:1px solid var(--border);text-align:left;">Role</th><th style="padding:8px 6px;border:1px solid var(--border);text-align:left;">School</th><th style="padding:8px 6px;border:1px solid var(--border);text-align:center;">Actions</th></tr>';

    Auth.users.forEach(u => {
      html += `<tr>
        <td style="padding:8px 6px;border:1px solid var(--border);">${u.username}</td>
        <td style="padding:8px 6px;border:1px solid var(--border);">${u.name || '—'}</td>
        <td style="padding:8px 6px;border:1px solid var(--border);"><span style="background:${u.role === 'admin' ? '#f59e0b' : '#4A6CF7'};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;">${u.role}</span></td>
        <td style="padding:8px 6px;border:1px solid var(--border);">${u.school || '—'}</td>
        <td style="padding:8px 6px;border:1px solid var(--border);text-align:center;">
          ${u.role !== 'admin' ? `<button class="admin-del-btn" data-id="${u.id}" style="background:var(--danger);color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.7rem;">Delete</button>` : '<span style="color:var(--text-secondary);font-size:0.7rem;">—</span>'}
        </td>
      </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll('.admin-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const user = Auth.users.find(u => u.id === id);
        if (!user) return;
        if (!await showConfirm('Delete User', `Delete "${user.username}"? This cannot be undone.`)) return;
        if (await Auth.deleteUser(id)) {
          showToast('Deleted', `User ${user.username} deleted`, 'info');
          this.adminLoadUsers();
        } else {
          showToast('Error', 'Failed to delete user', 'period-end');
        }
      });
    });
  },

  async adminCreateUser(e) {
    e.preventDefault();
    const username = document.getElementById('admin-new-username').value.trim();
    const name = document.getElementById('admin-new-name').value.trim();
    const password = document.getElementById('admin-new-password').value.trim();
    const school = document.getElementById('admin-new-school').value.trim();
    const errorEl = document.getElementById('admin-error');

    if (!username) { errorEl.textContent = 'Username required'; return; }
    errorEl.textContent = '';

    const result = await Auth.createUser({ username, name, password: password || 'password123', school, role: 'teacher' });
    if (result.ok) {
      showToast('User Added', `${result.user.username} created`, 'info');
      document.getElementById('admin-new-username').value = '';
      document.getElementById('admin-new-name').value = '';
      document.getElementById('admin-new-password').value = '';
      document.getElementById('admin-new-school').value = '';
      this.adminLoadUsers();
    } else {
      errorEl.textContent = result.error || 'Failed to create user';
    }
  },

  // ====== HELPERS ======
  getDayName(day) { return { M: 'Monday', T: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday' }[day] || day; },
  timeToMinutes(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  calculateEndTime(start, duration) { const m = this.timeToMinutes(start) + duration; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; },
  formatCountdown(minutes) {
    if (minutes === undefined || minutes === null) return '--:--';
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
