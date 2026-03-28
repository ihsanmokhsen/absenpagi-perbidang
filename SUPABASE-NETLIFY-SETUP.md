# Setup Awal Netlify + Supabase

Dokumen ini adalah tahap awal migrasi aplikasi `Absensi Apel Pagi BPAD Provinsi NTT` dari penyimpanan lokal ke arsitektur online menggunakan:

- Frontend statis di Netlify
- Database di Supabase
- Login biasa `username + password` tanpa Supabase Auth
- Netlify Functions sebagai lapisan backend ringan

## 1. Status Migrasi Saat Ini

Yang sudah disiapkan:

- [app-config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.js)
- [app-config.example.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.example.js)
- [config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/config.js)
- [data-source.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/data-source.js)
- [netlify/functions/login.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify/functions/login.js)
- [netlify/functions/employees.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify/functions/employees.js)
- [netlify/functions/attendance.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify/functions/attendance.js)
- [netlify/functions/reports.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify/functions/reports.js)
- [netlify.toml](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify.toml)
- [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql)
- [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql)

Yang masih memakai `localStorage` untuk sementara sebagai cache/fallback:

- session frontend
- cache absensi per tanggal
- cache laporan per tanggal

Jadi tahap ini sudah masuk ke jalur online inti, tetapi tetap aman karena browser masih menyimpan cache lokal.

Yang sudah bisa online:

- login biasa lewat Netlify Function
- pengambilan daftar pegawai dari Supabase saat mode `online` aktif
- simpan absensi harian ke Supabase
- baca absensi harian dan bulanan dari Supabase
- simpan laporan harian ke Supabase
- buka ulang laporan harian dari Supabase
- baca data laporan untuk rekap bulanan dari Supabase

## 2. Mode Aplikasi

Saat ini aplikasi mendukung dua mode:

- `local`
- `online`

Default masih `local`.

Konfigurasi ada di [config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/config.js):

```js
const APP_CONFIG = Object.freeze({
  dataMode: window.BPAD_APP_CONFIG?.dataMode || "local",
  apiBaseUrl: window.BPAD_APP_CONFIG?.apiBaseUrl || "/.netlify/functions",
});
```

Untuk mengaktifkan mode online nanti, cukup sediakan konfigurasi global seperti:

```html
<script>
  window.BPAD_APP_CONFIG = {
    dataMode: "online",
    apiBaseUrl: "/.netlify/functions",
  };
</script>
```

Di project ini, konfigurasi praktisnya sudah disediakan di:

- [app-config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.js)
- [app-config.example.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.example.js)

Default saat ini:

```js
window.BPAD_APP_CONFIG = {
  dataMode: "local",
  apiBaseUrl: "/.netlify/functions",
};
```

Jika ingin menyalakan mode online, ubah menjadi:

```js
window.BPAD_APP_CONFIG = {
  dataMode: "online",
  apiBaseUrl: "/.netlify/functions",
};
```

## 3. Struktur 5 Tabel

Tabel yang dipakai:

1. `app_bidang`
2. `app_accounts`
3. `app_pegawai`
4. `app_attendance`
5. `app_daily_reports`

File SQL:

- [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql)

## 4. Login Biasa Tanpa Supabase Auth

Login tidak memakai Supabase Auth.

Alur login:

1. Frontend mengirim `username` dan `password` ke Netlify Function `/login`
2. Function membaca tabel `app_accounts`
3. Password dicocokkan menggunakan hash `SHA-256`
4. Jika cocok, function mengembalikan session user ke frontend

Keuntungan pendekatan ini:

- tetap sesuai keinginan Anda: login biasa, bukan Auth bawaan Supabase
- password tidak dibandingkan langsung di browser saat mode online
- backend tetap ringan

## 5. Environment Variable di Netlify

Saat deploy ke Netlify, tambahkan environment variable:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Catatan:

- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di Netlify Functions
- jangan pernah ditaruh di file frontend

## 6. Langkah Setup Supabase

1. Buat project Supabase baru.
2. Buka SQL Editor.
3. Jalankan isi file [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql).
4. Jalankan isi file [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql).
5. Pastikan tabel `app_bidang`, `app_accounts`, dan `app_pegawai` berhasil terisi.

## 7. Langkah Setup Netlify

1. Hubungkan project ini ke Netlify.
2. Pastikan file [netlify.toml](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/netlify.toml) ikut terbaca.
3. Tambahkan environment variable:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy ulang project.

## 8. Endpoint yang Sudah Disiapkan

Endpoint awal yang sudah tersedia:

- `/.netlify/functions/login`
- `/.netlify/functions/employees`
- `/.netlify/functions/attendance`
- `/.netlify/functions/reports`

Fungsi masing-masing:

- `login`: validasi akun biasa menggunakan tabel `app_accounts`
- `employees`: mengambil daftar pegawai aktif dari tabel `app_pegawai`
- `attendance`: baca dan simpan absensi harian/bulanan
- `reports`: simpan, baca, dan buka ulang laporan harian

## 9. Langkah Migrasi Berikutnya

Setelah fondasi ini siap, tahap berikutnya yang saya sarankan adalah:

1. hilangkan ketergantungan dropdown akun statis dari frontend
2. tambahkan endpoint sinkronisasi atau import awal data absensi lama jika diperlukan
3. tambahkan validasi hak akses per akun di backend
4. tambahkan audit log perubahan absensi
5. kurangi ketergantungan `localStorage` agar benar-benar online penuh

## 10. Catatan Penting

Selama mode aplikasi masih `local`:

- aplikasi tetap berjalan seperti biasa
- tidak ada perilaku lama yang rusak
- fondasi online hanya disiapkan dulu

Ini sengaja dibuat bertahap supaya migrasi tetap aman.

## 11. Checklist Aktivasi Online

Urutan aktivasi yang paling aman:

1. Jalankan [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql)
2. Jalankan [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql)
3. Deploy project ke Netlify
4. Isi environment variable:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Ubah [app-config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.js) menjadi mode `online`
6. Deploy ulang atau refresh aplikasi
7. Uji login, daftar pegawai, mulai absen, simpan laporan, dan rekap bulanan
