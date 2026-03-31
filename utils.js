function openModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
}

function downloadExcelFile(htmlContent, filename) {
  const blob = new Blob([htmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openPrintWindow(content, title) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #1f2937;
          }
          h1, h2, h3 {
            margin: 0 0 12px;
          }
          p, li {
            font-size: 14px;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #cfd8e3;
            padding: 8px 10px;
            text-align: left;
            font-size: 13px;
            vertical-align: top;
          }
          th {
            background: #eff6ff;
          }
          section {
            margin-top: 18px;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getLogoSrc() {
  return new URL("logobaru.png", window.location.href).href;
}

function getReportLogoSrc() {
  return new URL("logontt.png", window.location.href).href;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key, fallbackValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(dateKey) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatDayAndDate(dateKey) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${year}-${month}-01T00:00:00`));
}

function formatLiveTime(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getEmployeeDirectory() {
  return state.employeeDirectory || EMPLOYEES;
}

function getAttendanceMode(dateKey = state.activeDate) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return day === 3 || day === 4 ? "per_bidang" : "full_badan";
}

function isPerBidangMode(dateKey = state.activeDate) {
  return getAttendanceMode(dateKey) === "per_bidang";
}

function isFullBadanMode(dateKey = state.activeDate) {
  return getAttendanceMode(dateKey) === "full_badan";
}

function canCurrentUserInputAttendance(dateKey = state.activeDate) {
  if (!state.currentUser) {
    return false;
  }

  if (isPerBidangMode(dateKey)) {
    return !isBpadAccount();
  }

  return isBpadAccount();
}

function canCurrentUserGenerateReport(dateKey = state.activeDate) {
  return canCurrentUserInputAttendance(dateKey);
}

function getModeLabel(dateKey = state.activeDate) {
  return isPerBidangMode(dateKey) ? "Per Bidang" : "Full Badan";
}

function getVisibleEmployees() {
  const scope = state.currentUser?.scope;
  const employeeDirectory = getEmployeeDirectory();
  const bidangList = scope === "ALL" ? Object.keys(employeeDirectory) : scope;
  return bidangList.flatMap((bidang) => employeeDirectory[bidang] || []);
}

function groupEmployeesByBidang(employees) {
  return employees.reduce((groups, employee) => {
    if (!groups[employee.bidang]) {
      groups[employee.bidang] = [];
    }

    groups[employee.bidang].push(employee);
    return groups;
  }, {});
}

function getAttendanceForDate(dateKey) {
  const attendance = loadFromStorage(STORAGE_KEYS.attendance, {});
  return attendance[dateKey] || {};
}

function getScopeLabel() {
  if (isFullBadanMode()) {
    return isBpadAccount() ? "Full Badan" : "Full Badan oleh BPAD";
  }

  if (isBpadAccount()) {
    return "Monitoring Semua Bidang";
  }

  return state.currentUser?.scope === "ALL"
    ? "Semua Bidang"
    : state.currentUser.scope.join(", ");
}

function isBpadAccount() {
  return state.currentUser?.username === "Badan Pendapatan dan Aset Daerah";
}

function getScopeKey() {
  return state.currentUser?.scope === "ALL"
    ? "ALL"
    : state.currentUser.scope.join("|");
}

function getScopeKeyForBidang(bidang) {
  return bidang;
}

function getCurrentBidangCode() {
  if (!state.currentUser || state.currentUser.scope === "ALL") {
    return "";
  }

  return Array.isArray(state.currentUser.scope) ? state.currentUser.scope[0] : "";
}

function getPetugasScopeCode(dateKey = state.activeDate) {
  if (isFullBadanMode(dateKey)) {
    return "FULL_BADAN";
  }

  return getCurrentBidangCode();
}

function getPetugasOptionsForCurrentUser() {
  if (isFullBadanMode()) {
    return [...new Set(Object.values(PETUGAS_BY_BIDANG).flat())];
  }

  const bidang = getCurrentBidangCode();
  return PETUGAS_BY_BIDANG[bidang] || [];
}

function getPetugasSelectionKey(dateKey = state.activeDate) {
  const scopeCode = getPetugasScopeCode(dateKey);
  return scopeCode ? `${dateKey}:${scopeCode}` : "";
}

function getSelectedPetugasName(dateKey = state.activeDate) {
  const key = getPetugasSelectionKey(dateKey);

  if (!key) {
    return "";
  }

  const selections = loadFromStorage(STORAGE_KEYS.petugas, {});

  if (selections[key]) {
    return selections[key];
  }

  const reportScope = isFullBadanMode(dateKey) ? "ALL" : getCurrentBidangCode();
  const savedReport = reportScope ? getDailyReportForBidang(dateKey, reportScope) : null;
  return savedReport?.petugasName || "";
}

function setSelectedPetugasName(name, dateKey = state.activeDate) {
  const key = getPetugasSelectionKey(dateKey);

  if (!key) {
    return;
  }

  const selections = loadFromStorage(STORAGE_KEYS.petugas, {});

  if (name) {
    selections[key] = name;
  } else {
    delete selections[key];
  }

  saveToStorage(STORAGE_KEYS.petugas, selections);
}

function getAttendanceViewEmployees() {
  if (isFullBadanMode()) {
    return canCurrentUserInputAttendance() ? getVisibleEmployees() : [];
  }

  if (!isBpadAccount()) {
    return getVisibleEmployees();
  }

  if (!state.selectedMonitoringBidang) {
    return [];
  }

  return getEmployeeDirectory()[state.selectedMonitoringBidang] || [];
}

function updateAttendancePanelState() {
  if (isFullBadanMode()) {
    elements.attendancePanel.classList.toggle("hidden", !canCurrentUserInputAttendance());
    elements.attendanceTitle.textContent = isBpadAccount()
      ? "Input Absensi Full Badan"
      : "Informasi Absensi Hari Ini";
    elements.attendanceHint.classList.remove("hidden");
    elements.attendanceHint.textContent = isBpadAccount()
      ? "Mode full badan aktif. Akun BPAD mengelola absensi seluruh pegawai pada hari ini."
      : "Hari ini menggunakan mode full badan. Input absensi dikelola oleh akun BPAD.";
    return;
  }

  if (!isBpadAccount()) {
    elements.attendancePanel.classList.remove("hidden");
    elements.attendanceTitle.textContent = "Input Absensi Per Bidang";
    elements.attendanceHint.classList.add("hidden");
    elements.attendanceHint.textContent = "";
    return;
  }

  if (state.selectedMonitoringBidang) {
    elements.attendancePanel.classList.remove("hidden");
    elements.attendanceTitle.textContent = `Detail Kehadiran ${state.selectedMonitoringBidang}`;
    elements.attendanceHint.classList.remove("hidden");
    elements.attendanceHint.textContent =
      "Mode monitoring BPAD. Klik bidang lain pada rangkuman untuk melihat detail bidang tersebut.";
    return;
  }

  elements.attendancePanel.classList.add("hidden");
  elements.attendanceTitle.textContent = "Detail Kehadiran Per Bidang";
  elements.attendanceHint.classList.remove("hidden");
  elements.attendanceHint.textContent =
    "Klik salah satu bidang pada Monitoring BPAD atau rangkuman bidang yang sudah lapor untuk melihat daftar pegawai.";
}

function getAttendanceEmptyMessage() {
  if (isFullBadanMode() && !canCurrentUserInputAttendance()) {
    return "Hari ini absensi menggunakan mode full badan dan dikelola oleh akun BPAD.";
  }

  if (isBpadAccount() && !state.selectedMonitoringBidang) {
    return "Belum ada bidang dipilih. Klik salah satu bidang pada Monitoring BPAD atau rangkuman bidang yang sudah lapor.";
  }

  return "Tidak ada data pegawai untuk akun ini.";
}

function hasDailyReportForBidang(dateKey, bidang) {
  const reports = loadFromStorage(STORAGE_KEYS.reports, {});
  const scopeKey = getScopeKeyForBidang(bidang);
  return Boolean(reports[dateKey]?.[scopeKey]);
}

function getDailyReportForBidang(dateKey, bidang) {
  const reports = loadFromStorage(STORAGE_KEYS.reports, {});
  const scopeKey = getScopeKeyForBidang(bidang);
  return reports[dateKey]?.[scopeKey] || null;
}

function isScopeFrozen(dateKey) {
  const reports = loadFromStorage(STORAGE_KEYS.reports, {});

  if (isFullBadanMode(dateKey)) {
    return Boolean(reports[dateKey]?.ALL);
  }

  if (!state.currentUser || state.currentUser.scope === "ALL") return false;

  const scopeKey = getScopeKey();
  return Boolean(reports[dateKey]?.[scopeKey]);
}

function getReadonlyMessage() {
  if (!canCurrentUserInputAttendance()) {
    if (isFullBadanMode()) {
      return isBpadAccount() ? "" : "Mode full badan dikelola BPAD";
    }

    return "Mode monitoring BPAD";
  }

  if (isScopeFrozen(state.activeDate)) {
    return "Absensi dibekukan karena laporan sudah disimpan";
  }

  return "";
}

function calculateSummary(dateKey, employees) {
  const summary = {
    total: employees.length,
    hadir: 0,
    sakit: 0,
    izin: 0,
    cuti: 0,
    terlambat: 0,
    tugas: 0,
    tubel: 0,
    kurang: 0,
  };

  const attendance = getAttendanceForDate(dateKey);

  employees.forEach((employee) => {
    const status = attendance[employee.id] || "hadir";
    summary[status] += 1;
  });

  summary.kurang = summary.total - summary.hadir;
  return summary;
}

function buildBidangQuickSummary(employees, dateAttendance) {
  const count = employees.reduce(
    (accumulator, employee) => {
      const status = dateAttendance[employee.id] || "hadir";
      accumulator[status] += 1;
      return accumulator;
    },
    {
      hadir: 0,
      sakit: 0,
      izin: 0,
      cuti: 0,
      terlambat: 0,
      tugas: 0,
      tubel: 0,
    }
  );

  const kurang = employees.length - count.hadir;
  return `Hadir ${count.hadir}/${employees.length} • Kurang ${kurang}`;
}

function getEmployeeDisplayName(employee) {
  const baseName = employee.nama || "";
  return getEmployeeType(employee) === "PPPK" ? `${baseName} (PPPK)` : baseName;
}
