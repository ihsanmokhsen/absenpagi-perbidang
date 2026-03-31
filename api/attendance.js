const {
  fetchEmployeesByCodes,
  fetchEmployeesByIds,
  findAccountId,
  parseRequestBody,
  sendJson,
  supabaseFetch,
} = require("./_lib/supabase");
const { getAuthenticatedUser } = require("./_lib/auth");
const { isFullBadanMode, isPerBidangMode } = require("./_lib/attendance-mode");

async function getAttendanceRows({ date, from, to }) {
  const query = new URLSearchParams({
    select: "attendance_date,status,employee_id",
    order: "attendance_date.asc",
  });

  if (date) {
    query.set("attendance_date", `eq.${date}`);
  } else {
    query.set("and", `(attendance_date.gte.${from},attendance_date.lte.${to})`);
  }

  const response = await supabaseFetch(`/rest/v1/app_attendance?${query.toString()}`);
  const attendanceRows = await response.json();
  const employeeRows = await fetchEmployeesByIds(attendanceRows.map((row) => row.employee_id));
  const employeeMap = new Map(employeeRows.map((row) => [row.id, row]));

  return attendanceRows
    .map((row) => {
      const employee = employeeMap.get(row.employee_id);
      if (!employee) return null;

      return {
        date: row.attendance_date,
        employeeId: employee.employee_code,
        bidang: employee.bidang_code,
        status: row.status,
      };
    })
    .filter(Boolean);
}

async function upsertAttendance({ date, employeeIds, status, username }) {
  const accountId = await findAccountId(username);
  const employees = await fetchEmployeesByCodes(employeeIds);

  if (employees.length !== employeeIds.length) {
    throw new Error("Sebagian data pegawai tidak ditemukan.");
  }

  const payload = employees.map((employee) => ({
    attendance_date: date,
    employee_id: employee.id,
    status,
    updated_by_account_id: accountId,
  }));

  const response = await supabaseFetch(
    "/rest/v1/app_attendance?on_conflict=attendance_date,employee_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Gagal menyimpan absensi ke Supabase.");
  }
}

async function getLockedBidangForDate(date, bidangCodes) {
  if (!bidangCodes.length) {
    return [];
  }

  const inClause = bidangCodes.map((code) => `"${code}"`).join(",");
  const query = new URLSearchParams({
    select: "bidang_code",
    report_date: `eq.${date}`,
    bidang_code: `in.(${inClause})`,
    is_locked: "eq.true",
  });

  const response = await supabaseFetch(`/rest/v1/app_daily_reports?${query.toString()}`);
  const rows = await response.json();
  return rows.map((row) => row.bidang_code);
}

module.exports = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return sendJson(res, 401, { message: "Sesi tidak valid atau sudah berakhir. Silakan login kembali." });
    }

    if (req.method === "GET") {
      const { date, from, to } = req.query || {};

      if (!date && !(from && to)) {
        return sendJson(res, 400, { message: "Parameter date atau from/to wajib diisi." });
      }

      const data = await getAttendanceRows({ date, from, to });
      const scopedData =
        user.accessScope === "ALL"
          ? data
          : data.filter((row) => row.bidang === user.bidangCode);

      return sendJson(res, 200, { data: scopedData });
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);

      if (!body?.date) {
        return sendJson(res, 400, { message: "Tanggal absensi wajib diisi." });
      }

      const perBidangMode = isPerBidangMode(body.date);

      if (perBidangMode && user.accessScope === "ALL") {
        return sendJson(res, 403, { message: "Pada hari ini akun BPAD hanya digunakan untuk monitoring per bidang." });
      }

      if (isFullBadanMode(body.date) && user.accessScope !== "ALL") {
        return sendJson(res, 403, { message: "Hari ini menggunakan mode full badan dan absensi dikelola oleh akun BPAD." });
      }

      const employeeIds =
        body.action === "bulk_upsert" ? body.employeeIds || [] : body.employeeId ? [body.employeeId] : [];
      const employees = await fetchEmployeesByCodes(employeeIds);

      const violatesScope =
        !employees.length ||
        (user.accessScope !== "ALL" &&
          employees.some((employee) => employee.bidang_code !== user.bidangCode));

      if (violatesScope) {
        return sendJson(res, 403, { message: "Anda hanya dapat mengubah absensi pada bidang sendiri." });
      }

      const bidangCodesToCheck =
        user.accessScope === "ALL"
          ? ["ALL"]
          : [user.bidangCode];
      const lockedBidang = await getLockedBidangForDate(body.date, bidangCodesToCheck);

      if (lockedBidang.length) {
        return sendJson(res, 403, {
          message:
            "Absensi hari ini sudah dibekukan karena laporan harian telah disimpan. Data tidak dapat diubah lagi. Jika diperlukan perbaikan, silakan hubungi kepegawaian.",
        });
      }

      if (body.action === "upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds,
          status: body.status,
          username: user.username,
        });
        return sendJson(res, 200, { success: true });
      }

      if (body.action === "bulk_upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds,
          status: body.status,
          username: user.username,
        });
        return sendJson(res, 200, { success: true });
      }

      return sendJson(res, 400, { message: "Action attendance tidak dikenal." });
    }

    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  } catch (error) {
    return sendJson(res, 500, { message: error.message || "Terjadi kesalahan pada attendance." });
  }
};
