# Catatan Keamanan

## Yang Sudah Diamankan

- password akun tidak lagi disimpan di source utama frontend
- file lokal untuk login lokal dipisahkan ke `app-local-auth.js`
- file `app-local-auth.js` sudah masuk `.gitignore`
- login online memakai Netlify/Vercel Function, bukan validasi password di browser
- `SUPABASE_SERVICE_ROLE_KEY` dirancang hanya untuk environment variable backend
- sesi login online sekarang memakai cookie `HttpOnly` agar tidak bisa dibaca JavaScript browser
- endpoint `attendance` dan `reports` sekarang memeriksa sesi dan hak akses server-side
- akun bidang tidak bisa lagi membuka ulang laporan dari API tanpa hak BPAD

## Yang Tidak Boleh Masuk GitHub

- `app-local-auth.js`
- `.env`
- `.env.*`
- key atau secret apa pun dari Supabase, Vercel, atau Netlify
- seed akun produksi atau hash password produksi

## Yang Boleh Dipublish

- `app-local-auth.example.js`
- `app-config.js`
- `app-config.example.js`
- file frontend umum
- file function backend tanpa secret hardcoded

## Rekomendasi Lanjut

- saat pindah ke Vercel, simpan semua secret di Project Environment Variables
- tambahkan `APP_SESSION_SECRET` terpisah dari key Supabase
- jangan gunakan `anon key` untuk operasi tulis sensitif jika logic ada di backend
- password lama berbasis SHA-256 akan di-upgrade otomatis ke format `scrypt` saat login berhasil
