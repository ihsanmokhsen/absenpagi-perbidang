document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
  });
});

let liveClockTimer = null;

async function init() {
  state.employeeDirectory = await loadEmployeeDirectory();
  populateAccountOptions();
  bindEvents();
  startLiveClock();
  await restoreSession();
}

function populateAccountOptions() {
  elements.accountSelect.innerHTML = `
    <option value="">Pilih akun</option>
    ${ACCOUNTS.map(
      (account) =>
        `<option value="${account.username}">${getAccountDisplayName(account.username)}</option>`
    ).join("")}
  `;
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", (event) => {
    handleLogin(event).catch((error) => {
      console.error(error);
      setLoginLoading(false);
      elements.loginMessage.textContent = "Login gagal diproses.";
    });
  });
  elements.logoutBtn.addEventListener("click", logout);
  elements.manageAccountsBtn.addEventListener("click", () => {
    openManageAccounts().catch((error) => {
      console.error(error);
      showToast("Gagal membuka kelola password akun.", "error");
    });
  });
  elements.startAttendanceBtn.addEventListener("click", startAttendance);
  elements.generateReportBtn.addEventListener("click", handleGenerateReport);
  elements.exportReportExcelBtn.addEventListener("click", exportCurrentReportExcel);
  elements.exportReportPdfBtn.addEventListener("click", exportCurrentReportPdf);
  elements.saveReportBtn.addEventListener("click", () => {
    saveCurrentReport().catch((error) => {
      console.error(error);
      showToast("Gagal menyimpan laporan harian.", "error");
    });
  });
  elements.openMonthlyBtn.addEventListener("click", () => {
    openMonthlyRecap().catch((error) => {
      console.error(error);
      showToast("Gagal membuka rekap bulanan.", "error");
    });
  });
  elements.refreshMonthlyBtn.addEventListener("click", () => {
    renderMonthlyRecap().catch((error) => {
      console.error(error);
      showToast("Gagal memuat rekap bulanan.", "error");
    });
  });
  elements.exportMonthlyExcelBtn.addEventListener("click", exportMonthlyRecapExcel);
  elements.exportMonthlyPdfBtn.addEventListener("click", exportMonthlyRecapPdf);
  elements.saveManagedAccountPasswordBtn.addEventListener("click", () => {
    handleSaveManagedAccountPassword().catch((error) => {
      console.error(error);
      showToast("Gagal menyimpan password akun.", "error");
    });
  });
  elements.attendanceContainer.addEventListener("click", handleAttendanceContainerClick);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
}

async function handleLogin(event) {
  event.preventDefault();

  const username = elements.accountSelect.value;
  const password = elements.passwordInput.value.trim();

  setLoginLoading(true);

  try {
    const session = await authenticateUser({ username, password });

    state.currentUser = session;
    state.selectedMonitoringBidang = null;
    persistSession(state.currentUser);
    elements.loginMessage.textContent = "";
    elements.loginForm.reset();
    await delay(1200);
    setLoginLoading(false);
    await showDashboard();
  } catch (error) {
    setLoginLoading(false);
    elements.loginMessage.textContent = error.message || "Akun atau password tidak sesuai.";
  }
}

async function restoreSession() {
  if (APP_CONFIG.dataMode === "online") {
    try {
      const session = await getOnlineSession();
      state.currentUser = session;
      state.selectedMonitoringBidang = null;
      persistSession(session);
      await showDashboard();
      return;
    } catch (error) {
      clearStoredSession();
      showLogin();
      return;
    }
  }

  const session = getStoredSession();
  if (!session) {
    showLogin();
    return;
  }

  state.currentUser = session;
  state.selectedMonitoringBidang = null;
  await showDashboard();
}

function showLogin() {
  elements.loginView.classList.remove("hidden");
  elements.dashboardView.classList.add("hidden");
}

async function showDashboard() {
  if (!state.currentUser) {
    showLogin();
    return;
  }

  elements.loginView.classList.add("hidden");
  elements.dashboardView.classList.remove("hidden");

  elements.activeAccountName.textContent = getAccountDisplayName(state.currentUser.username);
  state.activeDate = getTodayKey();
  elements.activeDateInput.value = formatDayAndDate(state.activeDate);
  elements.summaryTitle.textContent = `Statistik Hari Ini (${formatLongDate(state.activeDate)})`;
  elements.scopeInput.value = getScopeLabel();
  elements.todayLabel.textContent = `Hari ini: ${formatLongDate(state.activeDate)}`;
  elements.liveClock.textContent = `Jam: ${formatLiveTime()}`;
  await syncCurrentDateData(state.activeDate);
  updateToolbarAccess();
  renderDashboard();
}

async function logout() {
  if (APP_CONFIG.dataMode === "online") {
    try {
      await logoutOnline();
    } catch (error) {
      console.error(error);
    }
  }

  clearStoredSession();
  state.currentUser = null;
  state.currentReport = null;
  state.selectedMonitoringBidang = null;
  resetManageAccountsForm();
  showLogin();
}

function startLiveClock() {
  if (liveClockTimer) {
    window.clearInterval(liveClockTimer);
  }

  const updateClock = () => {
    if (elements.liveClock) {
      elements.liveClock.textContent = `Jam: ${formatLiveTime()}`;
    }
  };

  updateClock();
  liveClockTimer = window.setInterval(updateClock, 1000);
}

function setLoginLoading(isLoading) {
  elements.loginSubmitBtn.disabled = isLoading;
  elements.loginOverlay.classList.toggle("hidden", !isLoading);
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function openManageAccounts() {
  if (!isBpadAccount()) {
    return;
  }

  resetManageAccountsForm();
  elements.saveManagedAccountPasswordBtn.disabled = true;
  elements.managedAccountSelect.innerHTML = '<option value="">Memuat akun bidang...</option>';
  openModal("accountsModal");

  const accounts = await fetchManageableAccounts();
  elements.managedAccountSelect.innerHTML = `
    <option value="">Pilih akun bidang</option>
    ${accounts
      .filter((account) => account.is_active)
      .map(
        (account) => `
          <option value="${account.username}">${account.display_name || account.username}</option>
        `
      )
      .join("")}
  `;
  elements.saveManagedAccountPasswordBtn.disabled = false;
}

async function handleSaveManagedAccountPassword() {
  const username = elements.managedAccountSelect.value;
  const newPassword = elements.managedAccountPasswordInput.value.trim();
  const confirmPassword = elements.managedAccountPasswordConfirmInput.value.trim();

  if (!username) {
    elements.manageAccountsMessage.textContent = "Pilih akun bidang terlebih dahulu.";
    return;
  }

  if (newPassword.length < 6) {
    elements.manageAccountsMessage.textContent = "Password baru minimal 6 karakter.";
    return;
  }

  if (newPassword !== confirmPassword) {
    elements.manageAccountsMessage.textContent = "Konfirmasi password baru tidak cocok.";
    return;
  }

  elements.manageAccountsMessage.textContent = "";
  elements.saveManagedAccountPasswordBtn.disabled = true;

  try {
    const result = await updateManagedAccountPassword(username, newPassword);
    showToast(result.message || "Password akun berhasil diperbarui.", "success");
    resetManageAccountsForm();
    closeModal("accountsModal");
  } catch (error) {
    elements.manageAccountsMessage.textContent =
      error.message || "Gagal memperbarui password akun bidang.";
  } finally {
    elements.saveManagedAccountPasswordBtn.disabled = false;
  }
}

function resetManageAccountsForm() {
  elements.accountPasswordForm?.reset();
  elements.manageAccountsMessage.textContent = "";
  elements.managedAccountSelect.innerHTML = '<option value="">Pilih akun bidang</option>';
}

function renderDashboard() {
  renderSummary();
  renderMonitoringInsights();
  renderAttendanceList();
}

function updateToolbarAccess() {
  const isMonitoringOnly = isBpadAccount();
  const isFrozen = isScopeFrozen(state.activeDate);

  elements.generateReportBtn.classList.toggle("hidden", isMonitoringOnly);
  elements.startAttendanceBtn.classList.toggle("hidden", isMonitoringOnly);
  elements.manageAccountsBtn.classList.toggle("hidden", !isMonitoringOnly);
  elements.monitoringPanel.classList.toggle("hidden", !isMonitoringOnly);

  if (!isMonitoringOnly) {
    elements.startAttendanceBtn.disabled = isFrozen;
    elements.generateReportBtn.disabled = isFrozen;
    elements.freezeNotice.classList.toggle("hidden", !isFrozen);
    elements.freezeNotice.textContent = isFrozen
      ? "Absensi hari ini sudah dibekukan karena laporan harian telah disimpan. Data tidak dapat diubah lagi. Jika diperlukan perbaikan, silakan hubungi kepegawaian."
      : "";
  } else {
    elements.freezeNotice.classList.add("hidden");
    elements.freezeNotice.textContent = "";
  }
}

function getAccountDisplayName(username) {
  const displayNames = {
    "Badan Pendapatan dan Aset Daerah": "Badan Pendapatan dan Aset Daerah",
    SEKRETARIAT: "Sekretariat",
    "PENDAPATAN 1": "Pendapatan 1",
    "PENDAPATAN 2": "Pendapatan 2",
    "ASET 1": "Aset 1",
    "ASET 2": "Aset 2",
  };

  return displayNames[username] || username;
}

function startAttendance() {
  if (!state.currentUser || isBpadAccount() || isScopeFrozen(state.activeDate)) return;

  persistAttendanceBulk(
    state.activeDate,
    getVisibleEmployees().map((employee) => employee.id),
    "hadir"
  );
  renderDashboard();
  elements.attendancePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Absensi hari ini berhasil dimulai dan semua pegawai diset hadir.", "success");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function renderSummary() {
  const summary = calculateSummary(state.activeDate, getVisibleEmployees());
  const cards = [
    { key: "total", label: "Total", className: "total" },
    { key: "hadir", label: "Hadir", className: "hadir" },
    { key: "sakit", label: "Sakit", className: "sakit" },
    { key: "izin", label: "Izin", className: "izin" },
    { key: "cuti", label: "Cuti", className: "cuti" },
    { key: "terlambat", label: "Terlambat", className: "terlambat" },
    { key: "tugas", label: "Tugas", className: "tugas" },
    { key: "tubel", label: "Tubel", className: "tubel" },
    { key: "kurang", label: "Kurang", className: "kurang" },
  ];

  elements.summaryCards.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card ${card.className || ""}" data-summary-key="${card.key}">
          <p class="label">${card.label}</p>
          <div class="value">${summary[card.key]}</div>
        </article>
      `
    )
    .join("");
}

function renderAttendanceList() {
  const attendanceEmployees = getAttendanceViewEmployees();
  const grouped = groupEmployeesByBidang(attendanceEmployees);
  const dateAttendance = getAttendanceForDate(state.activeDate);

  updateAttendancePanelState();

  if (!Object.keys(grouped).length) {
    elements.attendanceContainer.innerHTML = `
      <div class="empty-state">${getAttendanceEmptyMessage()}</div>
    `;
    return;
  }

  elements.attendanceContainer.innerHTML = Object.entries(grouped)
    .map(([bidang, employees]) => renderBidangGroup(bidang, employees, dateAttendance))
    .join("");
}

function renderBidangGroup(bidang, employees, dateAttendance) {
  const asn = employees.filter((employee) => getEmployeeType(employee) === "ASN");
  const pppk = employees.filter((employee) => getEmployeeType(employee) === "PPPK");

  return `
    <section class="group-card" data-bidang="${bidang}">
      <div class="group-header">
        <div>
          <h4>${bidang}</h4>
          <p class="group-meta">${employees.length} pegawai</p>
        </div>
        <span class="tag" data-group-summary>${buildBidangQuickSummary(employees, dateAttendance)}</span>
      </div>

      <div class="group-body">
        ${renderEmployeeSection("ASN", asn, dateAttendance)}
        ${pppk.length ? renderEmployeeSection("PPPK", pppk, dateAttendance) : ""}
      </div>
    </section>
  `;
}

function getEmployeeType(employee) {
  if (employee.jenis) {
    return employee.jenis;
  }

  return employee.nama.includes("(PPPK)") ? "PPPK" : "ASN";
}

function renderEmployeeSection(title, employees, dateAttendance) {
  if (!employees.length) return "";
  const readOnly = isBpadAccount() || isScopeFrozen(state.activeDate);

  return `
    <div class="employee-section">
      <div class="employee-section-title">${title}</div>
      <div class="employee-list">
        ${employees
          .map((employee) => {
            const status = dateAttendance[employee.id] || "hadir";

            return `
              <div class="employee-row ${readOnly ? "readonly" : ""}" data-employee-id="${employee.id}">
                <div>
                  <div class="employee-name">${getEmployeeDisplayName(employee)}</div>
                  <div class="employee-meta">${employee.id} • ${employee.bidang}</div>
                </div>
                ${
                  readOnly
                    ? `
                        <div>
                          <div class="readonly-status ${status}">${STATUS_LABELS[status]}</div>
                        <div class="readonly-note">${getReadonlyMessage()}</div>
                      </div>
                    `
                    : `
                      <div class="status-options" aria-label="Status absensi ${getEmployeeDisplayName(employee)}">
                        ${STATUS_OPTIONS.map(
                          (option) => `
                            <button
                              type="button"
                              class="status-pill ${option === status ? "active" : ""}"
                              data-employee-id="${employee.id}"
                              data-status="${option}"
                            >
                              ${STATUS_LABELS[option]}
                            </button>
                          `
                        ).join("")}
                      </div>
                    `
                }
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function handleStatusChange(event) {
  if (isBpadAccount() || isScopeFrozen(state.activeDate)) {
    return;
  }

  const employeeId = event.currentTarget.dataset.employeeId;
  const status = event.currentTarget.dataset.status;
  persistAttendanceStatus(state.activeDate, employeeId, status);

  renderSummary();
  updateEmployeeRowStatus(employeeId, status);
}

function handleAttendanceContainerClick(event) {
  const button = event.target.closest(".status-pill");

  if (!button || !elements.attendanceContainer.contains(button)) {
    return;
  }

  handleStatusChange({ currentTarget: button });
}

function updateEmployeeRowStatus(employeeId, status) {
  const row = elements.attendanceContainer.querySelector(`[data-employee-id="${employeeId}"]`);

  if (!row) {
    renderAttendanceList();
    return;
  }

  row.querySelectorAll(".status-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === status);
  });

  updateGroupSummaryForRow(row);
}

function updateGroupSummaryForRow(row) {
  const groupCard = row.closest("[data-bidang]");

  if (!groupCard) {
    return;
  }

  const bidang = groupCard.dataset.bidang;
  const summaryTag = groupCard.querySelector("[data-group-summary]");
  const bidangEmployees = getEmployeeDirectory()[bidang] || [];

  if (!summaryTag || !bidangEmployees.length) {
    return;
  }

  summaryTag.textContent = buildBidangQuickSummary(bidangEmployees, getAttendanceForDate(state.activeDate));
}

function renderMonitoringInsights() {
  if (!isBpadAccount()) {
    elements.monitoringCards.innerHTML = "";
    elements.reportedSummary.innerHTML = "";
    return;
  }

  const employeeDirectory = getEmployeeDirectory();
  const cards = Object.keys(employeeDirectory)
    .map((bidang) => buildMonitoringCard(bidang, employeeDirectory[bidang]))
    .join("");

  elements.monitoringCards.innerHTML = cards;
  elements.reportedSummary.innerHTML = buildReportedSummary();

  document.querySelectorAll("[data-monitor-bidang]").forEach((item) => {
    item.addEventListener("click", () => {
      state.selectedMonitoringBidang = item.dataset.monitorBidang;
      renderAttendanceList();
      elements.attendancePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-reopen-bidang]").forEach((button) => {
    button.addEventListener("click", (event) => {
      handleReopenReport(event).catch((error) => {
        console.error(error);
        showToast("Gagal membuka ulang laporan bidang.", "error");
      });
    });
  });
}

function initializeAttendanceForDate(dateKey) {
  const attendance = loadFromStorage(STORAGE_KEYS.attendance, {});
  const dateData = attendance[dateKey] || {};
  let hasChanges = false;

  getVisibleEmployees().forEach((employee) => {
    if (!dateData[employee.id]) {
      dateData[employee.id] = "hadir";
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    return;
  }

  attendance[dateKey] = dateData;
  saveToStorage(STORAGE_KEYS.attendance, attendance);
}

function buildMonitoringCard(bidang, employees) {
  const hasReported = hasDailyReportForBidang(state.activeDate, bidang);

  return `
    <article class="monitoring-card clickable-card" data-monitor-bidang="${bidang}">
      <h4>${bidang}</h4>
      <p class="group-meta">${employees.length} pegawai terpantau</p>
      <div class="monitoring-block report-status">
        <span class="tag">Status Laporan Hari Ini</span>
        <strong>
          <span class="status-badge ${hasReported ? "done" : "pending"}">
            ${hasReported ? "Sudah Melapor" : "Belum Melapor"}
          </span>
        </strong>
        <span class="monitoring-stat">
          ${hasReported
            ? `Laporan harian bidang ${bidang} sudah disimpan.`
            : `Bidang ${bidang} belum generate atau simpan laporan harian.`}
        </span>
        ${
          hasReported
            ? `
              <button type="button" class="inline-action" data-reopen-bidang="${bidang}">
                Buka Ulang Laporan
              </button>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function buildReportedSummary() {
  const employeeDirectory = getEmployeeDirectory();
  const reportedBidang = Object.keys(employeeDirectory).filter((bidang) =>
    hasDailyReportForBidang(state.activeDate, bidang)
  );

  if (!reportedBidang.length) {
    return `
      <section class="reported-card">
        <h4>Rangkuman Bidang Yang Sudah Lapor</h4>
        <p class="section-note">Belum ada bidang yang menyimpan laporan harian hari ini.</p>
      </section>
    `;
  }

  return `
    <section class="reported-card">
      <h4>Rangkuman Bidang Yang Sudah Lapor</h4>
      <p class="section-note">${reportedBidang.length} bidang sudah menyimpan laporan harian.</p>
      <div class="reported-list">
        ${reportedBidang
          .map((bidang) => {
            const report = getDailyReportForBidang(state.activeDate, bidang);
            return `
              <div class="reported-item clickable-card" data-monitor-bidang="${bidang}">
                <strong>${bidang}</strong>
                <p>Jumlah: ${report?.summary?.total || 0} • Hadir: ${report?.summary?.hadir || 0} • Kurang: ${report?.summary?.kurang || 0}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

async function handleReopenReport(event) {
  event.stopPropagation();

  if (!isBpadAccount()) return;

  const bidang = event.currentTarget.dataset.reopenBidang;
  const shouldReopen = window.confirm(
    `Buka ulang laporan ${bidang} untuk ${formatLongDate(state.activeDate)}? Bidang ini akan bisa mengubah absensi dan generate ulang laporan.`
  );

  if (!shouldReopen) return;

  await reopenBidangReport(state.activeDate, bidang);
  state.selectedMonitoringBidang = bidang;
  await syncCurrentDateData(state.activeDate);
  renderDashboard();
  showToast(`Laporan ${bidang} dibuka kembali. Bidang dapat melakukan generate ulang.`, "warn");
}

async function reopenBidangReport(dateKey, bidang) {
  await reopenDailyReport(dateKey, bidang);
}
