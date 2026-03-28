create table if not exists public.app_bidang (
  code text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.app_accounts (
  id bigint generated always as identity primary key,
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  access_scope text not null check (access_scope in ('ALL', 'BIDANG')),
  bidang_code text references public.app_bidang(code) on update cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_accounts_scope_check check (
    (access_scope = 'ALL' and bidang_code is null)
    or (access_scope = 'BIDANG' and bidang_code is not null)
  )
);

create table if not exists public.app_pegawai (
  id bigint generated always as identity primary key,
  employee_code text not null unique,
  nama text not null,
  jenis text not null check (jenis in ('ASN', 'PPPK')),
  bidang_code text not null references public.app_bidang(code) on update cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_attendance (
  id bigint generated always as identity primary key,
  attendance_date date not null,
  employee_id bigint not null references public.app_pegawai(id) on delete cascade,
  status text not null check (status in ('hadir', 'sakit', 'izin', 'cuti', 'terlambat', 'tugas', 'tubel')),
  updated_by_account_id bigint references public.app_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_date, employee_id)
);

create table if not exists public.app_daily_reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  bidang_code text not null references public.app_bidang(code) on update cascade,
  account_id bigint references public.app_accounts(id) on delete set null,
  total integer not null default 0,
  hadir integer not null default 0,
  sakit integer not null default 0,
  izin integer not null default 0,
  cuti integer not null default 0,
  terlambat integer not null default 0,
  tugas integer not null default 0,
  tubel integer not null default 0,
  kurang integer not null default 0,
  summary_json jsonb not null default '{}'::jsonb,
  absent_details_json jsonb not null default '[]'::jsonb,
  is_locked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_date, bidang_code)
);

insert into public.app_bidang (code, name, sort_order)
values
  ('SEKRETARIAT', 'Sekretariat', 1),
  ('PENDAPATAN 1', 'Pendapatan 1', 2),
  ('PENDAPATAN 2', 'Pendapatan 2', 3),
  ('ASET 1', 'Aset 1', 4),
  ('ASET 2', 'Aset 2', 5)
on conflict (code) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- Demi keamanan, seed akun aplikasi tidak disimpan langsung di repository publik.
-- Tambahkan akun secara manual di project Supabase Anda, misalnya:
--
-- insert into public.app_accounts (username, display_name, password_hash, access_scope, bidang_code, is_active)
-- values
--   ('Badan Pendapatan dan Aset Daerah', 'Badan Pendapatan dan Aset Daerah', '<hash-password-aman>', 'ALL', null, true),
--   ('SEKRETARIAT', 'Sekretariat', '<hash-password-aman>', 'BIDANG', 'SEKRETARIAT', true);
