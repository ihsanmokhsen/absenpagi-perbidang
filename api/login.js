const { setSessionCookie } = require("./_lib/auth");
const {
  parseRequestBody,
  sendJson,
  supabaseFetch,
  updateAccountPasswordHash,
  verifyPassword,
} = require("./_lib/supabase");

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
      return sendJson(res, 500, {
        message: "Gagal mengambil data akun dari Supabase.",
      });
    }

    const [account] = await response.json();
    const passwordCheck = verifyPassword(password, account?.password_hash);

    if (!account || !account.is_active || !passwordCheck.valid) {
      return sendJson(res, 401, { message: "Akun atau password tidak sesuai." });
    }

    if (passwordCheck.upgradedHash) {
      await updateAccountPasswordHash(account.username, passwordCheck.upgradedHash);
    }

    const sessionUser = {
      username: account.username,
      displayName: account.display_name,
      accessScope: account.access_scope,
      bidangCode: account.bidang_code || null,
    };

    setSessionCookie(res, sessionUser);

    return sendJson(res, 200, {
      user: {
        username: sessionUser.username,
        displayName: sessionUser.displayName,
        scope: sessionUser.accessScope === "ALL" ? "ALL" : [sessionUser.bidangCode],
      },
    });
  } catch (error) {
    return sendJson(res, 500, {
      message: error.message || "Terjadi kesalahan saat login online.",
    });
  }
};
