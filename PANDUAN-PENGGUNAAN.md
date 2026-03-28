# Panduan Penggunaan Aplikasi

## Absensi Apel Pagi BPAD Provinsi NTT

Panduan ini dibuat untuk membantu penggunaan aplikasi absensi apel pagi berbasis lokal yang berjalan langsung di browser tanpa database online.

## 1. Tujuan Aplikasi

Aplikasi ini digunakan untuk:

- mencatat absensi apel pagi pegawai per bidang
- membuat laporan harian
- melihat rekap bulanan
- memantau status pelaporan tiap bidang dari akun BPAD

Seluruh data saat ini disimpan secara lokal di browser menggunakan `localStorage`.

## 2. Akun Login

Gunakan akun berikut untuk masuk ke aplikasi:

| Akun | Password | Hak Akses |
| --- | --- | --- |
| Badan Pendapatan dan Aset Daerah | `bpad1` | Monitoring semua bidang |
| Sekretariat | `sekretariat1` | Hanya bidang Sekretariat |
| Pendapatan 1 | `pendapatan11` | Hanya bidang Pendapatan 1 |
| Pendapatan 2 | `pendapatan21` | Hanya bidang Pendapatan 2 |
| Aset 1 | `aset11` | Hanya bidang Aset 1 |
| Aset 2 | `aset21` | Hanya bidang Aset 2 |

## 3. Cara Menjalankan Aplikasi

1. Buka file [index.html](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/index.html) di browser.
2. Pilih akun pada halaman login.
3. Masukkan password sesuai akun.
4. Tekan tombol `Login`.

## 4. Alur Penggunaan Akun Bidang

Alur penggunaan akun bidang adalah sebagai berikut:

1. Login menggunakan akun bidang masing-masing.
2. Setelah masuk, tanggal aktif otomatis mengikuti hari ini.
3. Daftar pegawai tampil sesuai bidang akun yang login.
4. Sebelum tombol `Mulai Absen` ditekan, status pegawai belum bisa diubah.
5. Tekan tombol `Mulai Absen`.
6. Sistem akan otomatis mengisi semua pegawai dengan status `Hadir`.
7. Ubah status pegawai yang perlu disesuaikan.
8. Jika sudah selesai, tekan `Generate Laporan Harian`.
9. Periksa preview laporan.
10. Tekan `Simpan Laporan`.

Setelah laporan harian disimpan:

- absensi bidang pada hari itu otomatis dibekukan
- data tidak bisa diubah lagi dari akun bidang
- tombol input dan generate laporan akan nonaktif

Pesan pembekuan:

`Absensi hari ini sudah dibekukan karena laporan harian telah disimpan. Data tidak dapat diubah lagi. Jika diperlukan perbaikan, silakan hubungi kepegawaian.`

## 5. Status Absensi

Status yang tersedia:

- Hadir
- Sakit
- Izin
- Cuti
- Terlambat
- Tugas
- Tubel

## 6. Tampilan Pegawai

Data pegawai ditampilkan:

- per bidang
- dipisahkan antara `ASN` dan `PPPK`
- pegawai `PPPK` ditampilkan dengan format nama `Nama Pegawai (PPPK)`

## 7. Laporan Harian

Preview laporan harian menampilkan:

- logo BPAD
- judul `Lapor Apel`
- nama instansi `BPAD Provinsi Nusa Tenggara Timur`
- hari dan tanggal
- jumlah pegawai
- kurang
- hadir
- rincian status keterangan
- daftar pegawai yang tidak hadir per bidang

Fitur pada laporan harian:

- simpan laporan
- export Excel
- export PDF

## 8. Rekap Bulanan

Menu `Lihat Rekap Bulanan` digunakan untuk:

- memilih bulan tertentu
- melihat rekap per pegawai
- melihat daftar laporan harian yang sudah tersimpan pada bulan tersebut
- export Excel
- export PDF

Informasi rekap per pegawai:

- hadir
- sakit
- izin
- cuti
- terlambat
- tugas
- tubel
- total tidak hadir
- tanggal tidak hadir

## 9. Alur Penggunaan Akun BPAD

Akun `Badan Pendapatan dan Aset Daerah` digunakan khusus untuk monitoring.

Hak akses akun BPAD:

- melihat semua bidang
- melihat statistik harian seluruh bidang
- melihat monitoring bidang yang sudah melapor dan belum melapor
- membuka detail pegawai per bidang dengan klik pada bidang
- melihat rekap bulanan per bidang
- membuka ulang laporan bidang tertentu bila diperlukan

Batasan akun BPAD:

- tidak dapat mengubah status absensi
- tidak dapat memulai absensi
- tidak digunakan untuk generate laporan harian bidang

## 10. Fitur Buka Ulang Laporan

Jika ada kesalahan pada data bidang yang sudah membeku:

1. Login menggunakan akun `Badan Pendapatan dan Aset Daerah`.
2. Buka panel `Monitoring BPAD`.
3. Cari bidang yang statusnya `Sudah Melapor`.
4. Tekan tombol `Buka Ulang Laporan`.

Setelah dibuka ulang:

- laporan harian bidang untuk hari itu dihapus dari status simpan
- bidang terkait bisa login kembali
- bidang bisa memperbaiki absensi
- bidang bisa generate dan simpan laporan ulang

## 11. Keterangan Penyimpanan Data

Data disimpan di browser masing-masing melalui `localStorage`, meliputi:

- sesi login aktif
- data absensi per tanggal
- laporan harian tersimpan

Catatan penting:

- jika browser dibersihkan datanya, maka data lokal bisa ikut hilang
- jika aplikasi dibuka di perangkat lain, data tidak otomatis ikut berpindah
- versi database akan dibuat nanti setelah alur aplikasi benar-benar final

## 12. Saran Penggunaan

Untuk penggunaan harian yang aman:

1. Gunakan browser yang sama setiap hari pada perangkat kerja yang sama.
2. Hindari membersihkan cache atau data situs tanpa kebutuhan.
3. Pastikan bidang menyimpan laporan harian setelah selesai input.
4. Gunakan akun BPAD untuk memantau bidang yang belum melapor.
5. Gunakan export Excel atau PDF saat perlu dilaporkan ke pimpinan.

## 13. File Utama Aplikasi

File utama aplikasi saat ini:

- [index.html](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/index.html)
- [style.css](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/style.css)
- [data.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/data.js)
- [utils.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/utils.js)
- [reports.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/reports.js)
- [app.js](/Users/ihsanmokhsen/Documents/@Project Sistem Informasi/Absenpagi-bidang/app.js)

## 14. Pengembangan Berikutnya

Rencana pengembangan ke depan:

- finalisasi alur penggunaan
- penyempurnaan tampilan dan kenyamanan mobile
- migrasi data ke database
- pembuatan backend untuk penggunaan multi perangkat
- penguatan login dan manajemen akun
