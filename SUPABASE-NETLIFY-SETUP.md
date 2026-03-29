# Setup Awal Vercel + Supabase

Dokumen ini adalah tahap awal migrasi aplikasi `Absensi Apel Pagi BPAD Provinsi NTT` dari penyimpanan lokal ke arsitektur online menggunakan:

- Frontend statis di Vercel
- Database di Supabase
- Login biasa `username + password` tanpa Supabase Auth
- Vercel Functions sebagai lapisan backend ringan

## 1. Status Migrasi Saat Ini

Yang sudah disiapkan:

- [app-config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.js)
- [app-config.example.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.example.js)
- [config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/config.js)
- [data-source.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/data-source.js)
- [api/login.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/api/login.js)
- [api/attendance.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/api/attendance.js)
- [api/reports.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/api/reports.js)
- [vercel.json](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/vercel.json)
- [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql)
- [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql)

Yang masih memakai `localStorage` untuk sementara sebagai cache/fallback:

- session frontend
- cache absensi per tanggal
- cache laporan per tanggal

Jadi tahap ini sudah masuk ke jalur online inti, tetapi tetap aman karena browser masih menyimpan cache lokal.

Yang sudah bisa online:

- login biasa lewat Vercel Function
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
  apiBaseUrl: window.BPAD_APP_CONFIG?.apiBaseUrl || "/api",
});
```

Untuk mengaktifkan mode online nanti, cukup sediakan konfigurasi global seperti:

```html
<script>
  window.BPAD_APP_CONFIG = {
    dataMode: "online",
    apiBaseUrl: "/api",
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
  apiBaseUrl: "/api",
};
```

Jika ingin menyalakan mode online, ubah menjadi:

```js
window.BPAD_APP_CONFIG = {
  dataMode: "online",
  apiBaseUrl: "/api",
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

Saat deploy ke Vercel, tambahkan environment variable:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Catatan:

- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di Vercel Functions
- jangan pernah ditaruh di file frontend

## 6. Langkah Setup Supabase

1. Buat project Supabase baru.
2. Buka SQL Editor.
3. Jalankan isi file [supabase/schema.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/schema.sql).
4. Tambahkan akun aplikasi secara manual ke tabel `app_accounts`.
5. Jalankan isi file [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql).
6. Pastikan tabel `app_bidang`, `app_accounts`, dan `app_pegawai` berhasil terisi.

## 7. Langkah Setup Vercel

1. Hubungkan repository GitHub ini ke Vercel.
2. Pastikan file [vercel.json](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/vercel.json) ikut terbaca.
3. Tambahkan environment variable:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_SESSION_SECRET` disarankan untuk menandatangani cookie sesi
4. Deploy ulang project.

## 8. Endpoint yang Sudah Disiapkan

Endpoint awal yang sudah tersedia:

- `/api/login`
- `/api/session`
- `/api/logout`
- `/api/attendance`
- `/api/reports`

Fungsi masing-masing:

- `login`: validasi akun biasa menggunakan tabel `app_accounts`
- `session`: membaca sesi login aktif dari cookie HTTP-only
- `logout`: menghapus sesi login aktif
- `attendance`: baca dan simpan absensi harian/bulanan
- `reports`: simpan, baca, dan buka ulang laporan harian

## 9. Langkah Migrasi Berikutnya

Setelah fondasi ini siap, tahap berikutnya yang saya sarankan adalah:

1. hilangkan ketergantungan dropdown akun statis dari frontend
2. tambahkan endpoint sinkronisasi atau import awal data absensi lama jika diperlukan
3. tambahkan audit trail lebih rinci per aksi backend
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
2. Tambahkan akun ke tabel `app_accounts`
3. Jalankan [supabase/seed-pegawai.sql](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/supabase/seed-pegawai.sql)
4. Import repo GitHub ke Vercel
5. Isi environment variable:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_SESSION_SECRET` disarankan
6. Ubah [app-config.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app-config.js) menjadi mode `online`
7. Deploy ulang atau refresh aplikasi
8. Uji login, daftar pegawai, mulai absen, simpan laporan, dan rekap bulanan
