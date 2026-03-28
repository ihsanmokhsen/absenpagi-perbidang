const { parseRequestBody, sendJson, sha256, supabaseFetch } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  }

  try {
    const { username, password } = parseRequestBody(req);

    if (!username || !password) {
      return sendJson(res, 400, { message: "Username dan password wajib diisi." });
    }

    const query = new URLSearchParams({
      select: "username,display_name,access_scope,bidang_code,password_hash,is_active",
      username: `eq.${username}`,
      limit: "1",
    });

    const response = await supabaseFetch(`/rest/v1/app_accounts?${query.toString()}`);

    if (!response.ok) {
      const detail = await response.text();
      return sendJson(res, 500, {
        message: `Gagal mengambil data akun dari Supabase. ${detail || `HTTP ${response.status}`}`,
      });
    }

    const [account] = await response.json();

    if (!account || !account.is_active || account.password_hash !== sha256(password)) {
      return sendJson(res, 401, { message: "Akun atau password tidak sesuai." });
    }

    return sendJson(res, 200, {
      user: {
        username: account.username,
        displayName: account.display_name,
        scope: account.access_scope === "ALL" ? "ALL" : [account.bidang_code],
      },
    });
  } catch (error) {
    return sendJson(res, 500, {
      message: error.message || "Terjadi kesalahan saat login online.",
    });
  }
};
