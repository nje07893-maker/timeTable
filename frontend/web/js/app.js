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

// ====== APP CONTROLLER ======
const App = {
  currentView: 'home',
  currentDay: 'M',
  selectedPeriodId: null,
  _tickTimer: null,

  async init() {
    this._bootApp();
  },

  async _bootApp() {
    Settings.load();
    Timetable.load();
    Notifications.init();
    Settings.applyTheme();
    this.updateHeader();

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    document.querySelectorAll('.day-tab').forEach(tab => {
      tab.addEventListener('click', () => this.selectDay(tab.dataset.day));
    });

    this._initDayCarousel();

    document.getElementById('add-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('add-clear-btn').addEventListener('click', () => this.clearForm());

    document.getElementById('add-subject').addEventListener('input', (e) => {
      const preview = document.getElementById('add-save-btn');
      preview.style.background = e.target.value.trim() ? Timetable.getSubjectColor(e.target.value.trim()) : '';
    });

    document.getElementById('set-save-btn').addEventListener('click', () => this.saveSettings());
    document.getElementById('set-darkmode').addEventListener('change', (e) => {
      document.body.classList.toggle('dark', e.target.checked);
    });

    document.getElementById('export-json-btn').addEventListener('click', () => this.exportJSON());
    document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => this.importJSON(e));
    document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPDF());
    document.getElementById('reset-data-btn').addEventListener('click', () => this.resetData());

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-edit-btn').addEventListener('click', () => this.editFromModal());
    document.getElementById('modal-delete-btn').addEventListener('click', () => this.deleteFromModal());
    document.getElementById('period-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    this._initInstall();

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
    });

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
  },

  updateHeader() {
    const teacher = Settings.get('teacherName');
    const school = Settings.get('schoolName');
    const name = teacher || 'Teacher';
    document.getElementById('app-title').textContent = school ? `${name} · ${school}` : name;
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

  // ====== INSTALL PWA ======
  _installPrompt: null,

  _initInstall() {
    const btn = document.getElementById('install-btn');
    if (!btn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._installPrompt = e;
      btn.style.display = '';
    });

    btn.addEventListener('click', async () => {
      if (!this._installPrompt) return;
      this._installPrompt.prompt();
      const result = await this._installPrompt.userChoice;
      if (result.outcome === 'accepted') btn.style.display = 'none';
      this._installPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      btn.style.display = 'none';
      this._installPrompt = null;
    });
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
