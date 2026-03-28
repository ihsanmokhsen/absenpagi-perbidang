const { findAccountId, sendJson, supabaseFetch } = require("./_lib/supabase");

async function getReportRows({ date, from, to }) {
  const query = new URLSearchParams({
    select:
      "report_date,bidang_code,total,hadir,sakit,izin,cuti,terlambat,tugas,tubel,kurang,summary_json,absent_details_json,created_at,updated_at",
    order: "report_date.asc",
  });

  if (date) {
    query.set("report_date", `eq.${date}`);
  } else {
    query.set("and", `(report_date.gte.${from},report_date.lte.${to})`);
  }

  const response = await supabaseFetch(`/rest/v1/app_daily_reports?${query.toString()}`);
  const rows = await response.json();

  return rows.map((row) => ({
    date: row.report_date,
    bidang: row.bidang_code,
    total: row.total,
    hadir: row.hadir,
    sakit: row.sakit,
    izin: row.izin,
    cuti: row.cuti,
    terlambat: row.terlambat,
    tugas: row.tugas,
    tubel: row.tubel,
    kurang: row.kurang,
    summaryJson: row.summary_json,
    absentDetails: row.absent_details_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function saveReport(report) {
  const accountId = await findAccountId(report.username);
  const payload = {
    report_date: report.date,
    bidang_code: report.bidang,
    account_id: accountId,
    total: report.total,
    hadir: report.hadir,
    sakit: report.sakit,
    izin: report.izin,
    cuti: report.cuti,
    terlambat: report.terlambat,
    tugas: report.tugas,
    tubel: report.tubel,
    kurang: report.kurang,
    summary_json: report.summaryJson || {},
    absent_details_json: report.absentDetails || [],
    is_locked: true,
  };

  const response = await supabaseFetch(
    "/rest/v1/app_daily_reports?on_conflict=report_date,bidang_code",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([payload]),
    }
  );

  if (!response.ok) {
    throw new Error("Gagal menyimpan laporan harian ke Supabase.");
  }
}

async function reopenReport({ date, bidang }) {
  const query = new URLSearchParams({
    report_date: `eq.${date}`,
    bidang_code: `eq.${bidang}`,
  });

  const response = await supabaseFetch(`/rest/v1/app_daily_reports?${query.toString()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Gagal membuka ulang laporan harian.");
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { date, from, to } = req.query || {};

      if (!date && !(from && to)) {
        return sendJson(res, 400, { message: "Parameter date atau from/to wajib diisi." });
      }

      const data = await getReportRows({ date, from, to });
      return sendJson(res, 200, { data });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (body.action === "save") {
        await saveReport(body.report || {});
        return sendJson(res, 200, { success: true });
      }

      if (body.action === "reopen") {
        await reopenReport({ date: body.date, bidang: body.bidang });
        return sendJson(res, 200, { success: true });
      }

      return sendJson(res, 400, { message: "Action report tidak dikenal." });
    }

    return sendJson(res, 405, { message: "Method tidak diizinkan." });
  } catch (error) {
    return sendJson(res, 500, { message: error.message || "Terjadi kesalahan pada reports." });
  }
};
