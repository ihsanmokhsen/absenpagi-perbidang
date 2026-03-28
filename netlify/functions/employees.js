function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { message: "Konfigurasi server Supabase belum lengkap." });
  }

  try {
    const requestUrl = new URL(`${supabaseUrl}/rest/v1/app_pegawai`);
    requestUrl.searchParams.set("select", "employee_code,nama,jenis,bidang_code");
    requestUrl.searchParams.set("is_active", "eq.true");
    requestUrl.searchParams.set("order", "employee_code.asc");

    const response = await fetch(requestUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      return json(500, { message: "Gagal mengambil data pegawai dari Supabase." });
    }

    const rows = await response.json();
    const data = rows.map((row) => ({
      id: row.employee_code,
      nama: row.nama,
      jenis: row.jenis,
      bidang: row.bidang_code,
    }));

    return json(200, { data });
  } catch (error) {
    return json(500, { message: "Terjadi kesalahan saat memuat data pegawai." });
  }
};
