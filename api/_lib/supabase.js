const crypto = require("node:crypto");

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function supabaseFetch(path, options = {}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  return fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
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

function sendJson(res, statusCode, body) {
  res.status(statusCode).json(body);
}

function parseRequestBody(req) {
  if (!req || typeof req.body === "undefined" || req.body === null) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (error) {
      return {};
    }
  }

  return req.body;
}

module.exports = {
  fetchEmployeesByCodes,
  fetchEmployeesByIds,
  findAccountId,
  parseRequestBody,
  sendJson,
  sha256,
  supabaseFetch,
};
