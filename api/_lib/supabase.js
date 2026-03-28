const crypto = require("node:crypto");

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const normalizedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/+$/, "") : "";

  return {
    supabaseUrl: normalizedSupabaseUrl,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const keyLength = 64;
  const cost = 16384;
  const blockSize = 8;
  const parallelization = 1;
  const derivedKey = crypto
    .scryptSync(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization })
    .toString("hex");

  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return { valid: false, upgradedHash: null };
  }

  if (storedHash.startsWith("scrypt$")) {
    const [, cost, blockSize, parallelization, salt, expectedKey] = storedHash.split("$");
    const derivedKey = crypto
      .scryptSync(password, salt, expectedKey.length / 2, {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallelization),
      })
      .toString("hex");

    if (derivedKey.length !== expectedKey.length) {
      return { valid: false, upgradedHash: null };
    }

    const derivedBuffer = Buffer.from(derivedKey, "hex");
    const expectedBuffer = Buffer.from(expectedKey, "hex");

    return {
      valid: crypto.timingSafeEqual(derivedBuffer, expectedBuffer),
      upgradedHash: null,
    };
  }

  return {
    valid: sha256(password) === storedHash,
    upgradedHash: createPasswordHash(password),
  };
}

async function supabaseFetch(path, options = {}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  if (!/^https?:\/\//.test(supabaseUrl)) {
    throw new Error("SUPABASE_URL tidak valid. Pastikan memakai Project URL dari Supabase.");
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

async function updateAccountPasswordHash(username, passwordHash) {
  const query = new URLSearchParams({
    username: `eq.${username}`,
  });

  const response = await supabaseFetch(`/rest/v1/app_accounts?${query.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("Gagal memperbarui hash password akun.");
  }
}

async function fetchEmployeesByCodes(employeeIds) {
  if (!employeeIds.length) {
    return [];
  }

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
  createPasswordHash,
  fetchEmployeesByCodes,
  fetchEmployeesByIds,
  findAccountId,
  parseRequestBody,
  sendJson,
  sha256,
  supabaseFetch,
  updateAccountPasswordHash,
  verifyPassword,
};
