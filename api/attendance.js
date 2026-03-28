const {
  fetchEmployeesByCodes,
  fetchEmployeesByIds,
  findAccountId,
  parseRequestBody,
  sendJson,
  supabaseFetch,
} = require("./_lib/supabase");

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

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { date, from, to } = req.query || {};

      if (!date && !(from && to)) {
        return sendJson(res, 400, { message: "Parameter date atau from/to wajib diisi." });
      }

      const data = await getAttendanceRows({ date, from, to });
      return sendJson(res, 200, { data });
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);

      if (body.action === "upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds: [body.employeeId],
          status: body.status,
          username: body.username,
        });
        return sendJson(res, 200, { success: true });
      }

      if (body.action === "bulk_upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds: body.employeeIds || [],
          status: body.status,
          username: body.username,
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
