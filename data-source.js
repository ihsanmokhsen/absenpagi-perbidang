function cloneEmployeeDirectory(directory = EMPLOYEES) {
  return JSON.parse(JSON.stringify(directory));
}

async function authenticateUser({ username, password }) {
  if (APP_CONFIG.dataMode === "online") {
    return authenticateUserOnline({ username, password });
  }

  throw new Error("Mode login lokal sudah dihapus. Gunakan mode online.");
}

async function authenticateUserOnline({ username, password }) {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/login`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Login online gagal diproses (HTTP ${response.status}).`);
  }

  return result.user;
}

async function getOnlineSession() {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/session`, {
    credentials: "same-origin",
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Sesi online tidak valid.");
  }

  return result.user;
}

async function logoutOnline() {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/logout`, {
    method: "POST",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Gagal keluar dari sesi online.");
  }
}

async function fetchManageableAccounts() {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/accounts`, {
    credentials: "same-origin",
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Gagal memuat daftar akun bidang.");
  }

  return result.data || [];
}

async function updateManagedAccountPassword(username, newPassword) {
  return postJson(`${APP_CONFIG.apiBaseUrl}/accounts`, {
    username,
    newPassword,
  });
}

async function loadEmployeeDirectory() {
  return cloneEmployeeDirectory();
}

function getStoredSession() {
  try {
    const session = localStorage.getItem(STORAGE_KEYS.session);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    return null;
  }
}

function persistSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function buildMonthDateRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month, 0);
  const lastDateKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
  return {
    from: firstDate,
    to: lastDateKey,
  };
}

function mergeAttendanceRowsIntoStorage(rows, replaceDateKeys = []) {
  const attendanceStore = loadFromStorage(STORAGE_KEYS.attendance, {});

  replaceDateKeys.forEach((dateKey) => {
    attendanceStore[dateKey] = {};
  });

  rows.forEach((row) => {
    if (!attendanceStore[row.date]) {
      attendanceStore[row.date] = {};
    }

    attendanceStore[row.date][row.employeeId] = row.status;
  });

  saveToStorage(STORAGE_KEYS.attendance, attendanceStore);
  return attendanceStore;
}

function buildStoredReportFromRow(row) {
  return {
    date: row.date,
    dayLabel: formatDayAndDate(row.date),
    scopeLabel: row.bidang,
    account: row.username || row.bidang,
    summary: {
      total: row.total,
      hadir: row.hadir,
      sakit: row.sakit,
      izin: row.izin,
      cuti: row.cuti,
      terlambat: row.terlambat,
      tugas: row.tugas,
      tubel: row.tubel,
      kurang: row.kurang,
      ...(row.summaryJson || {}),
    },
    absentDetails: row.absentDetails || [],
    generatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
  };
}

function mergeReportRowsIntoStorage(rows, replaceDateKeys = []) {
  const reportsStore = loadFromStorage(STORAGE_KEYS.reports, {});

  replaceDateKeys.forEach((dateKey) => {
    reportsStore[dateKey] = {};
  });

  rows.forEach((row) => {
    if (!reportsStore[row.date]) {
      reportsStore[row.date] = {};
    }

    reportsStore[row.date][row.bidang] = buildStoredReportFromRow(row);
  });

  saveToStorage(STORAGE_KEYS.reports, reportsStore);
  return reportsStore;
}

async function syncCurrentDateData(dateKey) {
  if (APP_CONFIG.dataMode !== "online") {
    return;
  }

  const [attendanceRows, reportRows] = await Promise.all([
    fetchAttendanceRowsByDate(dateKey),
    fetchReportRowsByDate(dateKey),
  ]);

  mergeAttendanceRowsIntoStorage(attendanceRows, [dateKey]);
  mergeReportRowsIntoStorage(reportRows, [dateKey]);
}

async function syncMonthlyData(monthKey) {
  if (APP_CONFIG.dataMode !== "online") {
    return;
  }

  const { from, to } = buildMonthDateRange(monthKey);
  const [attendanceRows, reportRows] = await Promise.all([
    fetchAttendanceRowsByRange(from, to),
    fetchReportRowsByRange(from, to),
  ]);

  const dateKeys = new Set();
  attendanceRows.forEach((row) => dateKeys.add(row.date));
  reportRows.forEach((row) => dateKeys.add(row.date));

  mergeAttendanceRowsIntoStorage(attendanceRows, [...dateKeys]);
  mergeReportRowsIntoStorage(reportRows, [...dateKeys]);
}

function setLocalAttendanceStatus(dateKey, employeeId, status) {
  const attendanceStore = loadFromStorage(STORAGE_KEYS.attendance, {});
  const dateData = attendanceStore[dateKey] || {};
  dateData[employeeId] = status;
  attendanceStore[dateKey] = dateData;
  saveToStorage(STORAGE_KEYS.attendance, attendanceStore);
}

function setLocalAttendanceBulk(dateKey, employeeIds, status) {
  const attendanceStore = loadFromStorage(STORAGE_KEYS.attendance, {});
  const dateData = attendanceStore[dateKey] || {};

  employeeIds.forEach((employeeId) => {
    dateData[employeeId] = status;
  });

  attendanceStore[dateKey] = dateData;
  saveToStorage(STORAGE_KEYS.attendance, attendanceStore);
}

function queueAttendanceStatusSync(dateKey, employeeId, status) {
  if (APP_CONFIG.dataMode !== "online") {
    return;
  }

  const timerKey = `${dateKey}:${employeeId}`;
  if (state.attendanceSyncTimers[timerKey]) {
    window.clearTimeout(state.attendanceSyncTimers[timerKey]);
  }

  state.attendanceSyncTimers[timerKey] = window.setTimeout(async () => {
    try {
      await postJson(`${APP_CONFIG.apiBaseUrl}/attendance`, {
        action: "upsert",
        date: dateKey,
        employeeId,
        status,
        username: state.currentUser?.username || null,
      });
    } catch (error) {
      console.error(error);
      if (typeof showToast === "function") {
        showToast("Sinkronisasi status pegawai gagal. Coba lagi sebentar.", "error");
      }
    } finally {
      delete state.attendanceSyncTimers[timerKey];
    }
  }, 180);
}

function persistAttendanceStatus(dateKey, employeeId, status) {
  setLocalAttendanceStatus(dateKey, employeeId, status);
  queueAttendanceStatusSync(dateKey, employeeId, status);
}

function persistAttendanceBulk(dateKey, employeeIds, status) {
  setLocalAttendanceBulk(dateKey, employeeIds, status);

  if (APP_CONFIG.dataMode !== "online") {
    return;
  }

  postJson(`${APP_CONFIG.apiBaseUrl}/attendance`, {
    action: "bulk_upsert",
    date: dateKey,
    employeeIds,
    status,
    username: state.currentUser?.username || null,
  }).catch((error) => {
    console.error(error);
    if (typeof showToast === "function") {
      showToast("Sinkronisasi absensi massal gagal. Coba lagi sebentar.", "error");
    }
  });
}

async function persistDailyReportOnline(report, bidangCode) {
  await postJson(`${APP_CONFIG.apiBaseUrl}/reports`, {
    action: "save",
    report: {
      date: report.date,
      bidang: bidangCode,
      username: state.currentUser?.username || null,
      total: report.summary.total,
      hadir: report.summary.hadir,
      sakit: report.summary.sakit,
      izin: report.summary.izin,
      cuti: report.summary.cuti,
      terlambat: report.summary.terlambat,
      tugas: report.summary.tugas,
      tubel: report.summary.tubel,
      kurang: report.summary.kurang,
      summaryJson: report.summary,
      absentDetails: report.absentDetails,
    },
  });
}

async function reopenDailyReport(dateKey, bidang) {
  if (APP_CONFIG.dataMode === "online") {
    await postJson(`${APP_CONFIG.apiBaseUrl}/reports`, {
      action: "reopen",
      date: dateKey,
      bidang,
    });
  }

  const reportsStore = loadFromStorage(STORAGE_KEYS.reports, {});

  if (reportsStore[dateKey]?.[bidang]) {
    delete reportsStore[dateKey][bidang];
    if (!Object.keys(reportsStore[dateKey]).length) {
      delete reportsStore[dateKey];
    }
    saveToStorage(STORAGE_KEYS.reports, reportsStore);
  }
}

async function fetchAttendanceRowsByDate(dateKey) {
  const query = new URLSearchParams({ date: dateKey });
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/attendance?${query.toString()}`, {
    credentials: "same-origin",
  });
  return unwrapRowsResponse(response, "Gagal memuat absensi harian online.");
}

async function fetchAttendanceRowsByRange(from, to) {
  const query = new URLSearchParams({ from, to });
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/attendance?${query.toString()}`, {
    credentials: "same-origin",
  });
  return unwrapRowsResponse(response, "Gagal memuat absensi bulanan online.");
}

async function fetchReportRowsByDate(dateKey) {
  const query = new URLSearchParams({ date: dateKey });
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/reports?${query.toString()}`, {
    credentials: "same-origin",
  });
  return unwrapRowsResponse(response, "Gagal memuat laporan harian online.");
}

async function fetchReportRowsByRange(from, to) {
  const query = new URLSearchParams({ from, to });
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/reports?${query.toString()}`, {
    credentials: "same-origin",
  });
  return unwrapRowsResponse(response, "Gagal memuat laporan bulanan online.");
}

async function unwrapRowsResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result.data || [];
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Permintaan online gagal diproses.");
  }

  return result;
}
