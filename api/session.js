const { getAuthenticatedUser } = require("./_lib/auth");
const { sendJson } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  }

  const user = getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { message: "Sesi tidak valid atau sudah berakhir." });
  }

  return sendJson(res, 200, {
    user: {
      username: user.username,
      displayName: user.displayName,
      scope: user.accessScope === "ALL" ? "ALL" : [user.bidangCode],
    },
  });
};
