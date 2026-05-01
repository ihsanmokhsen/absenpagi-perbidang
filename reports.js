function handleGenerateReport() {
  if (!canCurrentUserGenerateReport(state.activeDate)) {
    showToast(getGenerateReportBlockedMessage(), "warn");
    return;
  }

  if (isScopeFrozen(state.activeDate)) {
    showToast(getSavedTodayMessage("generate"), "warn");
    return;
  }

  const petugasName = getSelectedPetugasName(state.activeDate);

  if (!petugasName) {
    showToast("Pilih petugas absen terlebih dahulu sebelum generate laporan.", "warn");
    return;
  }

  const report = buildDailyReport(state.activeDate, { allowSave: true });
  state.currentReport = report;
  renderReportPreview(report);
  openModal("reportModal");
  showToast("Preview laporan sudah siap. Silakan periksa lalu simpan data absensi hari ini.", "info");
}

function handleBpadDailyRecap() {
  if (!isBpadAccount()) {
    return;
  }

  const report = buildDailyReport(state.activeDate, {
    scopeLabel: isFullBadanMode(state.activeDate) ? "Rekap Full Badan" : "Rekap Semua Bidang",
    petugasName: "-",
    allowSave: false,
  });
  state.currentReport = report;
  renderReportPreview(report);
  openModal("reportModal");
}

function getGenerateReportBlockedMessage() {
  if (isFullBadanMode(state.activeDate)) {
    return isBpadAccount()
      ? "Generate laporan full badan hanya tersedia untuk akun BPAD."
      : "Hari ini absensi dikelola penuh oleh akun BPAD.";
  }

  return "Hari ini laporan hanya dapat digenerate oleh akun bidang masing-masing.";
}

function getSavedTodayMessage(action = "save") {
  return action === "generate"
    ? "Data absensi sudah tersimpan untuk hari ini. Generate ulang tidak diperlukan."
    : "Data absensi sudah tersimpan untuk hari ini. Simpan ulang tidak dapat dilakukan.";
}

function buildDailyReport(dateKey, options = {}) {
  const visibleEmployees = options.employees || getVisibleEmployees();
  const summary = calculateSummary(dateKey, visibleEmployees);
  const grouped = groupEmployeesByBidang(visibleEmployees);
  const dateAttendance = getAttendanceForDate(dateKey);

  const absentDetails = Object.entries(grouped).map(([bidang, employees]) => {
    const notPresent = employees
      .map((employee) => ({
        ...employee,
        status: dateAttendance[employee.id] || "hadir",
      }))
      .filter((employee) => employee.status !== "hadir")
      .map((employee) => ({
        ...employee,
        status: employee.status,
      }));

    return { bidang, notPresent };
  });

  return {
    date: dateKey,
    dayLabel: formatDayAndDate(dateKey),
    scopeLabel: options.scopeLabel || getScopeLabel(),
    account: state.currentUser.username,
    petugasName: options.petugasName ?? getSelectedPetugasName(dateKey),
    allowSave: options.allowSave ?? true,
    summary,
    absentDetails,
    generatedAt: new Date().toISOString(),
  };
}

function renderReportPreview(report) {
  elements.saveReportBtn.classList.toggle("hidden", report.allowSave === false);

  const absentSections = report.absentDetails
    .map(({ bidang, notPresent }) => {
      if (!notPresent.length) {
        return `
          <div class="report-overview">
            <h4>${bidang}</h4>
            <p class="section-note">Semua pegawai hadir.</p>
          </div>
        `;
      }

      return `
        <div class="report-overview">
          <h4>${bidang}</h4>
          <div class="not-present-list">
            ${notPresent
              .map(
                (person) => `
                  <div class="person-chip">
                    ${getEmployeeDisplayName(person)}
                    <span class="status">${STATUS_LABELS[person.status]}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  elements.reportContent.innerHTML = `
    <section class="report-overview report-sheet">
      <div class="report-brand">
        <img src="${getReportLogoSrc()}" alt="Logo BPAD Provinsi NTT" class="report-logo" />
        <div>
          <p class="report-kicker">Lapor Apel</p>
          <h4>BPAD Provinsi Nusa Tenggara Timur</h4>
        </div>
      </div>

      <div class="report-meta">
        <p><strong>Hari/Tanggal:</strong> ${report.dayLabel}</p>
        <p><strong>Petugas:</strong> ${report.petugasName || "-"}</p>
      </div>

      <div class="report-grid report-grid-main">
        <div class="report-stat report-stat-strong">
          <span>Jumlah</span>
          <strong>${report.summary.total}</strong>
        </div>
        <div class="report-stat report-stat-strong">
          <span>Kurang</span>
          <strong>${report.summary.kurang}</strong>
        </div>
        <div class="report-stat report-stat-strong">
          <span>Hadir</span>
          <strong>${report.summary.hadir}</strong>
        </div>
      </div>

      <div class="report-section">
        <h4>Keterangan</h4>
        <div class="report-grid report-grid-status">
          ${["sakit", "izin", "cuti", "terlambat", "tugas", "tubel"]
            .map(
              (key) => `
                <div class="report-stat">
                  <span>${STATUS_LABELS[key]}</span>
                  <strong>${report.summary[key]}</strong>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="report-section">
      <h4>Rincian Pegawai Tidak Hadir</h4>
      ${absentSections}
    </section>
  `;
}

function exportCurrentReportExcel() {
  if (!state.currentReport) return;

  const report = state.currentReport;
  const summaryRows = `
    <tr><th>Hari/Tanggal</th><td>${escapeHtml(report.dayLabel)}</td></tr>
    <tr><th>Lingkup</th><td>${escapeHtml(report.scopeLabel)}</td></tr>
    <tr><th>Petugas</th><td>${escapeHtml(report.petugasName || "-")}</td></tr>
    <tr><th>Jumlah</th><td>${report.summary.total}</td></tr>
    <tr><th>Kurang</th><td>${report.summary.kurang}</td></tr>
    <tr><th>Hadir</th><td>${report.summary.hadir}</td></tr>
  `;

  const statusRows = STATUS_OPTIONS.map(
    (status) => `
      <tr>
        <th>${STATUS_LABELS[status]}</th>
        <td>${report.summary[status]}</td>
      </tr>
    `
  ).join("");

  const absentRows = report.absentDetails
    .flatMap(({ bidang, notPresent }) =>
      notPresent.length
        ? notPresent.map(
            (person) => `
              <tr>
                <td>${escapeHtml(bidang)}</td>
                <td>${escapeHtml(getEmployeeDisplayName(person))}</td>
                <td>${escapeHtml(STATUS_LABELS[person.status])}</td>
              </tr>
            `
          )
        : [
            `
              <tr>
                <td>${escapeHtml(bidang)}</td>
                <td>-</td>
                <td>Semua hadir</td>
              </tr>
            `,
          ]
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h2>Lapor Apel</h2>
        <h3>BPAD Provinsi Nusa Tenggara Timur</h3>
        <table border="1">
          ${summaryRows}
          ${statusRows}
        </table>
        <br />
        <table border="1">
          <thead>
            <tr>
              <th>Bidang</th>
              <th>Nama Pegawai</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${absentRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadExcelFile(
    html,
    `laporan-harian-${slugify(report.scopeLabel)}-${report.date}.xls`
  );
}

function exportCurrentReportPdf() {
  if (!state.currentReport) return;

  const report = state.currentReport;
  const absentSections = report.absentDetails
    .map(({ bidang, notPresent }) => {
      const items = notPresent.length
        ? `<ul>${notPresent
            .map(
              (person) =>
                `<li>${escapeHtml(getEmployeeDisplayName(person))} - ${escapeHtml(STATUS_LABELS[person.status])}</li>`
            )
            .join("")}</ul>`
        : "<p>Semua pegawai hadir.</p>";

      return `
        <section>
          <h3>${escapeHtml(bidang)}</h3>
          ${items}
        </section>
      `;
    })
    .join("");

  openPrintWindow(`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
      <img src="${escapeHtml(getReportLogoSrc())}" alt="Logo BPAD Provinsi NTT" style="width:64px;height:64px;object-fit:contain;" />
      <div>
        <h1 style="margin-bottom:6px;">Lapor Apel</h1>
        <p style="margin:0;font-weight:700;">BPAD Provinsi Nusa Tenggara Timur</p>
      </div>
    </div>
    <p><strong>Hari/Tanggal:</strong> ${escapeHtml(report.dayLabel)}</p>
    <p><strong>Petugas:</strong> ${escapeHtml(report.petugasName || "-")}</p>
    <p><strong>Lingkup:</strong> ${escapeHtml(report.scopeLabel)}</p>
    <p><strong>Jumlah:</strong> ${report.summary.total}</p>
    <p><strong>Hadir:</strong> ${report.summary.hadir}</p>
    <p><strong>Kurang:</strong> ${report.summary.kurang}</p>
    <table>
      <thead>
        <tr>
          ${STATUS_OPTIONS.map((status) => `<th>${escapeHtml(STATUS_LABELS[status])}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        <tr>
          ${STATUS_OPTIONS.map((status) => `<td>${report.summary[status]}</td>`).join("")}
        </tr>
      </tbody>
    </table>
    <h2>Rincian Pegawai Tidak Hadir</h2>
    ${absentSections}
  `, `Laporan Harian ${report.scopeLabel}`);
}

async function saveCurrentReport() {
  if (!state.currentReport) {
    showToast("Generate laporan terlebih dahulu sebelum menyimpan data hari ini.", "warn");
    return;
  }

  if (state.currentReport.allowSave === false) {
    showToast("Rekap ini hanya untuk dilihat atau diexport, bukan untuk disimpan sebagai laporan.", "warn");
    return;
  }

  if (!canCurrentUserGenerateReport(state.activeDate)) {
    showToast(getGenerateReportBlockedMessage(), "warn");
    return;
  }

  if (isScopeFrozen(state.activeDate)) {
    showToast(getSavedTodayMessage("save"), "warn");
    return;
  }

  const scopeKey = getScopeKey();

  if (APP_CONFIG.dataMode === "online") {
    const bidangCode = isFullBadanMode(state.activeDate)
      ? "ALL"
      : Array.isArray(state.currentUser.scope)
        ? state.currentUser.scope[0]
        : scopeKey;
    await persistDailyReportOnline(state.currentReport, bidangCode);
  }

  const reports = loadFromStorage(STORAGE_KEYS.reports, {});

  if (!reports[state.currentReport.date]) {
    reports[state.currentReport.date] = {};
  }

  const reportStorageKey = isFullBadanMode(state.activeDate) ? "ALL" : scopeKey;
  reports[state.currentReport.date][reportStorageKey] = state.currentReport;
  saveToStorage(STORAGE_KEYS.reports, reports);
  await syncCurrentDateData(state.activeDate);

  closeModal("reportModal");
  updateToolbarAccess();
  renderAttendanceList();
  showToast(
    isFullBadanMode(state.activeDate)
      ? "Data absensi full badan sudah tersimpan untuk hari ini dan langsung dibekukan."
      : "Data absensi hari ini sudah tersimpan dan langsung dibekukan.",
    "success"
  );
}

async function openMonthlyRecap() {
  elements.monthPicker.value = state.activeDate.slice(0, 7);
  await renderMonthlyRecap();
  openModal("monthlyModal");
}

async function renderMonthlyRecap() {
  const monthKey = elements.monthPicker.value || state.activeDate.slice(0, 7);
  await syncMonthlyData(monthKey);
  const employees = getVisibleEmployees();
  const recapRows = employees.map((employee) => buildEmployeeMonthlyRecap(employee, monthKey));
  const savedReports = getSavedReportsForMonth(monthKey);
  const groupedRecap = groupRowsByBidang(recapRows);
  const topLateRows = getTopLateEmployees(recapRows);

  const recapHtml = recapRows.length
    ? Object.entries(groupedRecap)
        .map(([bidang, rows]) => buildMonthlyRecapSectionHtml(bidang, rows))
        .join("")
    : `<div class="table-empty">Belum ada data pegawai untuk ditampilkan.</div>`;

  const reportHtml = savedReports.length
    ? savedReports
        .map(
          (report) => `
            <article class="saved-report-item">
              <p><strong>${report.dayLabel}</strong></p>
              <p>Lingkup: ${report.scopeLabel}</p>
              <p>Petugas: ${report.petugasName || "-"}</p>
              <p>Jumlah: ${report.summary.total} • Hadir: ${report.summary.hadir} • Kurang: ${report.summary.kurang}</p>
            </article>
          `
        )
        .join("")
    : `<div class="table-empty">Belum ada laporan harian tersimpan pada bulan ini.</div>`;

  const topLateHtml = topLateRows.length
    ? `
        <div class="late-ranking-list">
          ${topLateRows
            .map(
              (row, index) => `
                <article class="late-ranking-item">
                  <div class="late-ranking-order">#${index + 1}</div>
                  <div class="late-ranking-body">
                    <strong>${getEmployeeDisplayName(row)}</strong>
                    <p>${row.bidang}</p>
                  </div>
                  <div class="late-ranking-count">${row.terlambat}x terlambat</div>
                </article>
              `
            )
            .join("")}
        </div>
      `
    : `<div class="table-empty">Belum ada data keterlambatan pada bulan ini.</div>`;

  elements.monthlyContent.innerHTML = `
    <div class="monthly-layout">
      <section class="section-card">
        <h4>Pegawai Paling Sering Terlambat</h4>
        <p class="section-note">Diurutkan berdasarkan jumlah keterlambatan terbanyak pada bulan ${formatMonthLabel(monthKey)}.</p>
        ${topLateHtml}
      </section>

      <section class="section-card">
        <h4>Tabel Rekap Pegawai Bulan ${formatMonthLabel(monthKey)}</h4>
        <p class="section-note">Rekap dihitung otomatis dari data absensi harian yang tersimpan.</p>
        ${recapHtml}
      </section>

      <section class="section-card">
        <h4>Daftar Rekap Harian Tersimpan</h4>
        <div class="saved-report-list">${reportHtml}</div>
      </section>
    </div>
  `;
}

function exportMonthlyRecapExcel() {
  const monthKey = elements.monthPicker.value || state.activeDate.slice(0, 7);
  const recapRows = getVisibleEmployees().map((employee) =>
    buildEmployeeMonthlyRecap(employee, monthKey)
  );
  const savedReports = getSavedReportsForMonth(monthKey);
  const groupedRecap = groupRowsByBidang(recapRows);
  const topLateRows = getTopLateEmployees(recapRows);

  const recapSections = Object.entries(groupedRecap)
    .map(
      ([bidang, rows]) => `
        <h3>${escapeHtml(bidang)}</h3>
        <table border="1">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Bidang</th>
              <th>Hadir</th>
              <th>Sakit</th>
              <th>Izin</th>
              <th>Cuti</th>
              <th>Terlambat</th>
              <th>Tugas</th>
              <th>Tubel</th>
              <th>Total Tidak Hadir</th>
              <th>Tanggal Tidak Hadir</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(getEmployeeDisplayName(row))}</td>
                    <td>${escapeHtml(row.bidang)}</td>
                    <td>${row.hadir}</td>
                    <td>${row.sakit}</td>
                    <td>${row.izin}</td>
                    <td>${row.cuti}</td>
                    <td>${row.terlambat}</td>
                    <td>${row.tugas}</td>
                    <td>${row.tubel}</td>
                    <td>${row.totalTidakHadir}</td>
                    <td>${escapeHtml(row.tanggalTidakHadir.join(", ") || "-")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <br />
      `
    )
    .join("");

  const reportRows = savedReports.length
    ? savedReports
        .map(
          (report) => `
            <tr>
              <td>${escapeHtml(report.dayLabel)}</td>
              <td>${escapeHtml(report.scopeLabel)}</td>
              <td>${report.summary.total}</td>
              <td>${report.summary.hadir}</td>
              <td>${report.summary.kurang}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">Belum ada laporan harian tersimpan.</td></tr>`;

  const topLateTableRows = topLateRows.length
    ? topLateRows
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(getEmployeeDisplayName(row))}</td>
              <td>${escapeHtml(row.bidang)}</td>
              <td>${row.terlambat}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">Belum ada data keterlambatan pada bulan ini.</td></tr>`;

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h2>Rekap Bulanan Absensi Apel Pagi BPAD Provinsi NTT</h2>
        <p>Bulan: ${escapeHtml(formatMonthLabel(monthKey))}</p>
        <p>Lingkup: ${escapeHtml(getScopeLabel())}</p>
        <table border="1">
          <thead>
            <tr>
              <th>Peringkat</th>
              <th>Nama</th>
              <th>Bidang</th>
              <th>Jumlah Terlambat</th>
            </tr>
          </thead>
          <tbody>
            ${topLateTableRows}
          </tbody>
        </table>
        <br />
        ${recapSections}
        <table border="1">
          <thead>
            <tr>
              <th>Hari/Tanggal</th>
              <th>Lingkup</th>
              <th>Jumlah</th>
              <th>Hadir</th>
              <th>Kurang</th>
            </tr>
          </thead>
          <tbody>
            ${reportRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadExcelFile(
    html,
    `rekap-bulanan-${slugify(getScopeLabel())}-${monthKey}.xls`
  );
}

function exportMonthlyRecapPdf() {
  const monthKey = elements.monthPicker.value || state.activeDate.slice(0, 7);
  const recapRows = getVisibleEmployees().map((employee) =>
    buildEmployeeMonthlyRecap(employee, monthKey)
  );
  const savedReports = getSavedReportsForMonth(monthKey);
  const groupedRecap = groupRowsByBidang(recapRows);
  const topLateRows = getTopLateEmployees(recapRows);

  const reportItems = savedReports.length
    ? `<ul>${savedReports
        .map(
          (report) =>
            `<li>${escapeHtml(report.dayLabel)} - ${escapeHtml(report.scopeLabel)} - Jumlah ${report.summary.total}, Hadir ${report.summary.hadir}, Kurang ${report.summary.kurang}</li>`
        )
        .join("")}</ul>`
    : "<p>Belum ada laporan harian tersimpan.</p>";

  const recapSections = Object.entries(groupedRecap)
    .map(
      ([bidang, rows]) => `
        <h2>${escapeHtml(bidang)}</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Bidang</th>
              <th>Hadir</th>
              <th>Sakit</th>
              <th>Izin</th>
              <th>Cuti</th>
              <th>Terlambat</th>
              <th>Tugas</th>
              <th>Tubel</th>
              <th>Total Tidak Hadir</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(getEmployeeDisplayName(row))}</td>
                    <td>${escapeHtml(row.bidang)}</td>
                    <td>${row.hadir}</td>
                    <td>${row.sakit}</td>
                    <td>${row.izin}</td>
                    <td>${row.cuti}</td>
                    <td>${row.terlambat}</td>
                    <td>${row.tugas}</td>
                    <td>${row.tubel}</td>
                    <td>${row.totalTidakHadir}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
    )
    .join("");

  const topLateSection = topLateRows.length
    ? `
        <table>
          <thead>
            <tr>
              <th>Peringkat</th>
              <th>Nama</th>
              <th>Bidang</th>
              <th>Jumlah Terlambat</th>
            </tr>
          </thead>
          <tbody>
            ${topLateRows
              .map(
                (row, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(getEmployeeDisplayName(row))}</td>
                    <td>${escapeHtml(row.bidang)}</td>
                    <td>${row.terlambat}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
    : "<p>Belum ada data keterlambatan pada bulan ini.</p>";

  openPrintWindow(`
    <h1>Rekap Bulanan Absensi Apel Pagi BPAD Provinsi NTT</h1>
    <p><strong>Bulan:</strong> ${escapeHtml(formatMonthLabel(monthKey))}</p>
    <p><strong>Lingkup:</strong> ${escapeHtml(getScopeLabel())}</p>
    <h2>Pegawai Paling Sering Terlambat</h2>
    ${topLateSection}
    ${recapSections}
    <h2>Daftar Rekap Harian Tersimpan</h2>
    ${reportItems}
  `, `Rekap Bulanan ${formatMonthLabel(monthKey)}`);
}

function buildMonthlyRecapSectionHtml(bidang, rows) {
  const tableHtml = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>Bidang</th>
            <th>Hadir</th>
            <th>Sakit</th>
            <th>Izin</th>
            <th>Cuti</th>
            <th>Terlambat</th>
            <th>Tugas</th>
            <th>Tubel</th>
            <th>Total Tidak Hadir</th>
            <th>Tanggal Tidak Hadir</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${getEmployeeDisplayName(row)}</td>
                  <td>${row.bidang}</td>
                  <td>${row.hadir}</td>
                  <td>${row.sakit}</td>
                  <td>${row.izin}</td>
                  <td>${row.cuti}</td>
                  <td>${row.terlambat}</td>
                  <td>${row.tugas}</td>
                  <td>${row.tubel}</td>
                  <td>${row.totalTidakHadir}</td>
                  <td>${row.tanggalTidakHadir.join(", ") || "-"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  const mobileHtml = `
    <div class="mobile-recap-list">
      ${rows
        .map(
          (row) => `
            <article class="mobile-recap-card">
              <h5>${getEmployeeDisplayName(row)}</h5>
              <span class="tag">${row.bidang}</span>
              <div class="mobile-recap-grid">
                <div class="mobile-recap-stat">Hadir<strong>${row.hadir}</strong></div>
                <div class="mobile-recap-stat">Sakit<strong>${row.sakit}</strong></div>
                <div class="mobile-recap-stat">Izin<strong>${row.izin}</strong></div>
                <div class="mobile-recap-stat">Cuti<strong>${row.cuti}</strong></div>
                <div class="mobile-recap-stat">Terlambat<strong>${row.terlambat}</strong></div>
                <div class="mobile-recap-stat">Tugas<strong>${row.tugas}</strong></div>
                <div class="mobile-recap-stat">Tubel<strong>${row.tubel}</strong></div>
                <div class="mobile-recap-stat">Tidak Hadir<strong>${row.totalTidakHadir}</strong></div>
              </div>
              <p>Tanggal tidak hadir: ${row.tanggalTidakHadir.join(", ") || "-"}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  return `
    <section class="section-card">
      <h4>${bidang}</h4>
      <p class="section-note">${rows.length} pegawai</p>
      ${tableHtml}
      ${mobileHtml}
    </section>
  `;
}

function groupRowsByBidang(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.bidang]) {
      groups[row.bidang] = [];
    }

    groups[row.bidang].push(row);
    return groups;
  }, {});
}

function buildEmployeeMonthlyRecap(employee, monthKey) {
  const attendance = loadFromStorage(STORAGE_KEYS.attendance, {});
  const row = {
    nama: employee.nama,
    bidang: employee.bidang,
    jenis: employee.jenis,
    hadir: 0,
    sakit: 0,
    izin: 0,
    cuti: 0,
    terlambat: 0,
    tugas: 0,
    tubel: 0,
    totalTidakHadir: 0,
    tanggalTidakHadir: [],
  };

  Object.entries(attendance).forEach(([dateKey, entries]) => {
    if (!dateKey.startsWith(monthKey)) return;

    const status = entries[employee.id] || "hadir";
    row[status] += 1;

    if (status !== "hadir") {
      row.totalTidakHadir += 1;
      row.tanggalTidakHadir.push(formatShortDate(dateKey));
    }
  });

  return row;
}

function getTopLateEmployees(rows, limit = 5) {
  return rows
    .filter((row) => row.terlambat > 0)
    .sort((a, b) => {
      if (b.terlambat !== a.terlambat) {
        return b.terlambat - a.terlambat;
      }

      if (b.totalTidakHadir !== a.totalTidakHadir) {
        return b.totalTidakHadir - a.totalTidakHadir;
      }

      return getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), "id");
    })
    .slice(0, limit);
}

function getSavedReportsForMonth(monthKey) {
  const reports = loadFromStorage(STORAGE_KEYS.reports, {});
  const scopeKey = getScopeKey();
  const result = [];

  Object.entries(reports).forEach(([dateKey, reportScopes]) => {
    if (!dateKey.startsWith(monthKey)) return;

    if (scopeKey === "ALL") {
      Object.values(reportScopes).forEach((report) => result.push(report));
      return;
    }

    if (reportScopes[scopeKey]) {
      result.push(reportScopes[scopeKey]);
    }
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}
