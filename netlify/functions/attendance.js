function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function supabaseFetch(path, options = {}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return response;
}

async function findAccountId(username) {
  if (!username) return null;

  const query = new URLSearchParams({
    select: "id",
    username: `eq.${username}`,
    limit: "1",
  });

  const response = await supabaseFetch(`/rest/v1/app_accounts?${query.toString()}`);
  const rows = await response.json();
  return rows[0]?.id || null;
}

async function fetchEmployeesByCodes(employeeIds) {
  const inClause = employeeIds.map((id) => `"${id}"`).join(",");
  const query = new URLSearchParams({
    select: "id,employee_code,bidang_code",
    employee_code: `in.(${inClause})`,
  });

  const response = await supabaseFetch(`/rest/v1/app_pegawai?${query.toString()}`);
  return response.json();
}

async function fetchEmployeesByIds(employeeDbIds) {
  if (!employeeDbIds.length) {
    return [];
  }

  const inClause = employeeDbIds.join(",");
  const query = new URLSearchParams({
    select: "id,employee_code,bidang_code",
    id: `in.(${inClause})`,
  });

  const response = await supabaseFetch(`/rest/v1/app_pegawai?${query.toString()}`);
  return response.json();
}

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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const { date, from, to } = event.queryStringParameters || {};

      if (!date && !(from && to)) {
        return json(400, { message: "Parameter date atau from/to wajib diisi." });
      }

      const data = await getAttendanceRows({ date, from, to });
      return json(200, { data });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds: [body.employeeId],
          status: body.status,
          username: body.username,
        });
        return json(200, { success: true });
      }

      if (body.action === "bulk_upsert") {
        await upsertAttendance({
          date: body.date,
          employeeIds: body.employeeIds || [],
          status: body.status,
          username: body.username,
        });
        return json(200, { success: true });
      }

      return json(400, { message: "Action attendance tidak dikenal." });
    }

    return json(405, { message: "Method tidak diizinkan." });
  } catch (error) {
    return json(500, { message: error.message || "Terjadi kesalahan pada attendance." });
  }
};
