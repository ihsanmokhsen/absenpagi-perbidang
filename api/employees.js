const { sendJson, supabaseFetch } = require("./_lib/supabase");

module.exports = async (_req, res) => {
  try {
    const query = new URLSearchParams({
      select: "employee_code,nama,jenis,bidang_code",
      is_active: "eq.true",
      order: "employee_code.asc",
    });

    const response = await supabaseFetch(`/rest/v1/app_pegawai?${query.toString()}`);

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
