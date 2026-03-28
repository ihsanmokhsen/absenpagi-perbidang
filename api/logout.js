const { clearSessionCookie } = require("./_lib/auth");
const { sendJson } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  }

  clearSessionCookie(res);
  return sendJson(res, 200, { success: true });
};
