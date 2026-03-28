const crypto = require("node:crypto");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method tidak diizinkan." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { message: "Konfigurasi server Supabase belum lengkap." });
  }

  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return json(400, { message: "Username dan password wajib diisi." });
    }

    const requestUrl = new URL(`${supabaseUrl}/rest/v1/app_accounts`);
    requestUrl.searchParams.set("select", "username,display_name,access_scope,bidang_code,password_hash,is_active");
    requestUrl.searchParams.set("username", `eq.${username}`);
    requestUrl.searchParams.set("limit", "1");

    const response = await fetch(requestUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      return json(500, { message: "Gagal mengambil data akun dari Supabase." });
    }

    const [account] = await response.json();

    if (!account || !account.is_active) {
      return json(401, { message: "Akun atau password tidak sesuai." });
    }

    if (account.password_hash !== sha256(password)) {
      return json(401, { message: "Akun atau password tidak sesuai." });
    }

    return json(200, {
      user: {
        username: account.username,
        displayName: account.display_name,
        scope: account.access_scope === "ALL" ? "ALL" : [account.bidang_code],
      },
    });
  } catch (error) {
    return json(500, { message: "Terjadi kesalahan saat login online." });
  }
};
