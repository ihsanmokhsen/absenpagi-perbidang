const { getAuthenticatedUser } = require("./_lib/auth");
const {
  createPasswordHash,
  parseRequestBody,
  sendJson,
  supabaseFetch,
} = require("./_lib/supabase");

async function getBidangAccounts() {
  const query = new URLSearchParams({
    select: "username,display_name,bidang_code,is_active",
    access_scope: "eq.BIDANG",
    order: "display_name.asc",
  });

  const response = await supabaseFetch(`/rest/v1/app_accounts?${query.toString()}`);

  if (!response.ok) {
    throw new Error("Gagal memuat daftar akun bidang.");
  }

  return response.json();
}

async function updateAccountPassword(username, newPassword) {
  const query = new URLSearchParams({
    username: `eq.${username}`,
    access_scope: "eq.BIDANG",
  });

  const response = await supabaseFetch(`/rest/v1/app_accounts?${query.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      password_hash: createPasswordHash(newPassword),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("Gagal memperbarui password akun.");
  }

  const rows = await response.json();
  return rows[0] || null;
}

module.exports = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return sendJson(res, 401, { message: "Sesi tidak valid atau sudah berakhir. Silakan login kembali." });
    }

    if (user.accessScope !== "ALL") {
      return sendJson(res, 403, { message: "Hanya akun BPAD yang dapat mengelola password akun bidang." });
    }

    if (req.method === "GET") {
      const data = await getBidangAccounts();
      return sendJson(res, 200, { data });
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);
      const username = (body.username || "").trim();
      const newPassword = (body.newPassword || "").trim();

      if (!username || !newPassword) {
        return sendJson(res, 400, { message: "Akun dan password baru wajib diisi." });
      }

      if (newPassword.length < 6) {
        return sendJson(res, 400, { message: "Password baru minimal 6 karakter." });
      }

      const account = await updateAccountPassword(username, newPassword);

      if (!account) {
        return sendJson(res, 404, { message: "Akun bidang tidak ditemukan." });
      }

      return sendJson(res, 200, {
        success: true,
        message: `Password akun ${account.display_name || account.username} berhasil diperbarui.`,
      });
    }

    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  } catch (error) {
    return sendJson(res, 500, {
      message: error.message || "Terjadi kesalahan saat mengelola akun.",
    });
  }
};
