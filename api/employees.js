const { sendJson, supabaseFetch } = require("./_lib/supabase");

module.exports = async (_req, res) => {
  try {
    const requestUrl = new URL(`${process.env.SUPABASE_URL}/rest/v1/app_pegawai`);
    requestUrl.searchParams.set("select", "employee_code,nama,jenis,bidang_code");
    requestUrl.searchParams.set("is_active", "eq.true");
    requestUrl.searchParams.set("order", "employee_code.asc");

    const response = await supabaseFetch(requestUrl.pathname + requestUrl.search);

    if (!response.ok) {
      return sendJson(res, 500, { message: "Gagal mengambil data pegawai dari Supabase." });
    }

    const rows = await response.json();
    const data = rows.map((row) => ({
      id: row.employee_code,
      nama: row.nama,
      jenis: row.jenis,
      bidang: row.bidang_code,
    }));

    return sendJson(res, 200, { data });
  } catch (error) {
    return sendJson(res, 500, { message: "Terjadi kesalahan saat memuat data pegawai." });
  }
};
