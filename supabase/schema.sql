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

insert into public.app_accounts (username, display_name, password_hash, access_scope, bidang_code, is_active)
values
  ('Badan Pendapatan dan Aset Daerah', 'Badan Pendapatan dan Aset Daerah', '6b0a8a804ba20425b20816bbe9bf69e31696348506b05329abc15c2e417d9b01', 'ALL', null, true),
  ('SEKRETARIAT', 'Sekretariat', '10449288371e4d99d2a73672e5d6d32cb4fbc42b138bac9464999ad944a403e7', 'BIDANG', 'SEKRETARIAT', true),
  ('PENDAPATAN 1', 'Pendapatan 1', 'fd7fc6501b223e36ffd3da053c6b74ac9c232dda069e4b7309dc8a8a55d63080', 'BIDANG', 'PENDAPATAN 1', true),
  ('PENDAPATAN 2', 'Pendapatan 2', '3d7320763edfdb9bc0ad1301363d0fc6cedc6796f2ae3affd72cfdc7a1fc0b14', 'BIDANG', 'PENDAPATAN 2', true),
  ('ASET 1', 'Aset 1', '85fe761080a6c1fce674fba83c68401fa66177150119fe941d8b71db201217a8', 'BIDANG', 'ASET 1', true),
  ('ASET 2', 'Aset 2', 'd927eb5b2b770b45cb2b75382c6901b035b166a531bdef97ec30e43b947ec47f', 'BIDANG', 'ASET 2', true)
on conflict (username) do update
set
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  access_scope = excluded.access_scope,
  bidang_code = excluded.bidang_code,
  is_active = excluded.is_active,
  updated_at = now();
