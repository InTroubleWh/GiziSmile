-- ==============================================================================
-- GiziSmile — Master Seed Data (Terverifikasi Sesuai TKPI 2020 Kemenkes RI)
-- Salin dan jalankan skrip ini pada menu "SQL Editor" di Dashboard Supabase Anda
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SINKRONISASI PROFIL PENGGUNA (public.profiles)
-- Mengambil akun yang sudah terdaftar di auth.users dan memberikan peran (role) yang tepat
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(
    u.raw_user_meta_data->>'role',
    CASE
      WHEN u.email ILIKE '%kader%' THEN 'kader'
      WHEN u.email ILIKE '%gizi%' THEN 'nutritionist'
      ELSE 'parent'
    END
  )
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 2. DATA BALITA POSYANDU (public.children di 5 Wilayah)
-- ------------------------------------------------------------------------------
INSERT INTO public.children (id, name, birth_date, gender, region) VALUES
('c0000001-0000-0000-0000-000000000001', 'Ahmad Rizky Pratama', '2024-10-01', 'male', 'Desa Sukamaju'),
('c0000002-0000-0000-0000-000000000002', 'Bayu Nugroho', '2024-04-10', 'male', 'Desa Sukamaju'),
('c0000003-0000-0000-0000-000000000003', 'Citra Dewi', '2024-01-15', 'female', 'Desa Sukamaju'),
('c0000004-0000-0000-0000-000000000004', 'Siti Aisyah Nurfadilah', '2024-06-15', 'female', 'Desa Karanganyar'),
('c0000005-0000-0000-0000-000000000005', 'Daffa Alfarizi', '2023-11-20', 'male', 'Desa Karanganyar'),
('c0000006-0000-0000-0000-000000000006', 'Eka Putri Lestari', '2024-08-05', 'female', 'Desa Karanganyar'),
('c0000007-0000-0000-0000-000000000007', 'Budi Santoso', '2023-12-10', 'male', 'Kelurahan Cibiru'),
('c0000008-0000-0000-0000-000000000008', 'Fadhil Rahman', '2024-05-25', 'male', 'Kelurahan Cibiru'),
('c0000009-0000-0000-0000-000000000009', 'Dewi Lestari', '2024-02-20', 'female', 'Desa Mekarjaya'),
('c0000010-0000-0000-0000-000000000010', 'Gilang Ramadhan', '2023-09-14', 'male', 'Desa Mekarjaya'),
('c0000011-0000-0000-0000-000000000011', 'Hana Pertiwi', '2024-03-30', 'female', 'Desa Tanjungsari'),
('c0000012-0000-0000-0000-000000000012', 'Ihsan Maulana', '2023-10-18', 'male', 'Desa Tanjungsari')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  birth_date = EXCLUDED.birth_date,
  gender = EXCLUDED.gender,
  region = EXCLUDED.region;

-- ------------------------------------------------------------------------------
-- 3. REKAM PENGUKURAN ANTROPOMETRI (public.measurements)
-- ------------------------------------------------------------------------------
INSERT INTO public.measurements (id, child_id, measured_at, age_months, height_cm, weight_kg, zscore_hfa, zscore_wfa, zscore_wfh) VALUES
('b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', '2026-10-15', 24, 80.5, 10.0, -2.39, -1.71, -0.64),
('b0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', '2026-10-14', 30, 92.5, 13.6, -0.25, 0.12, 0.35),
('b0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', '2026-10-12', 33, 84.0, 10.2, -3.15, -2.45, -0.95),
('b0000004-0000-0000-0000-000000000004', 'c0000004-0000-0000-0000-000000000004', '2026-10-12', 28, 89.2, 12.8, 0.15, 0.28, 0.32),
('b0000005-0000-0000-0000-000000000005', 'c0000005-0000-0000-0000-000000000005', '2026-10-11', 35, 96.0, 14.5, -0.10, 0.15, 0.25),
('b0000006-0000-0000-0000-000000000006', 'c0000006-0000-0000-0000-000000000006', '2026-10-10', 26, 81.2, 10.1, -2.20, -1.80, -0.75),
('b0000007-0000-0000-0000-000000000007', 'c0000007-0000-0000-0000-000000000007', '2026-10-10', 34, 88.0, 11.5, -2.52, -2.15, -0.92),
('b0000008-0000-0000-0000-000000000008', 'c0000008-0000-0000-0000-000000000008', '2026-10-09', 29, 91.5, 13.0, -0.30, -0.15, 0.10),
('b0000009-0000-0000-0000-000000000009', 'c0000009-0000-0000-0000-000000000009', '2026-10-08', 32, 93.0, 13.5, 0.22, 0.12, 0.05),
('b0000010-0000-0000-0000-000000000010', 'c0000010-0000-0000-0000-000000000010', '2026-10-07', 37, 91.0, 12.2, -2.45, -2.10, -0.80),
('b0000011-0000-0000-0000-000000000011', 'c0000011-0000-0000-0000-000000000011', '2026-10-05', 31, 92.0, 13.2, 0.05, 0.08, 0.12),
('b0000012-0000-0000-0000-000000000012', 'c0000012-0000-0000-0000-000000000012', '2026-10-04', 36, 96.2, 14.2, -0.18, -0.05, 0.18)
ON CONFLICT (id) DO UPDATE SET
  child_id = EXCLUDED.child_id,
  measured_at = EXCLUDED.measured_at,
  age_months = EXCLUDED.age_months,
  height_cm = EXCLUDED.height_cm,
  weight_kg = EXCLUDED.weight_kg,
  zscore_hfa = EXCLUDED.zscore_hfa,
  zscore_wfa = EXCLUDED.zscore_wfa,
  zscore_wfh = EXCLUDED.zscore_wfh;

-- ------------------------------------------------------------------------------
-- 4. MASTER KOMODITAS PANGAN LOKAL (public.commodities)
-- ------------------------------------------------------------------------------
INSERT INTO public.commodities (id, name, category, unit, gram_per_unit, source) VALUES
('com_lele', 'Ikan Lele Segar', 'Ikan & Hasil Laut', 'kg', 1000, 'seed'),
('com_hati_ayam', 'Hati Ayam Ras', 'Daging & Unggas', 'kg', 1000, 'seed'),
('com_telur', 'Telur Ayam Ras', 'Telur', 'butir', 62, 'seed'),
('com_tempe', 'Tempe Kedelai', 'Kacang-kacangan', 'papan', 400, 'seed'),
('com_tahu', 'Tahu Putih Lembut', 'Kacang-kacangan', 'bungkus', 500, 'seed'),
('com_kelor', 'Daun Kelor Segar', 'Sayuran', 'ikat', 150, 'seed'),
('com_bayam', 'Bayam Hijau Segar', 'Sayuran', 'ikat', 200, 'seed'),
('com_ayam', 'Daging Ayam Ras Segar', 'Daging & Unggas', 'kg', 1000, 'seed'),
('com_gabus', 'Ikan Gabus / Tawar', 'Ikan & Hasil Laut', 'kg', 1000, 'seed'),
('com_wortel', 'Wortel Segar', 'Sayuran', 'kg', 1000, 'seed'),
('com_beras', 'Beras Putih Medium', 'Beras & Biji-bijian', 'kg', 1000, 'seed'),
('com_minyak', 'Minyak Goreng Sawit', 'Minyak & Lemak', 'liter', 900, 'seed'),
('com_bawang_merah', 'Bawang Merah', 'Bumbu Dapur', 'kg', 1000, 'api'),
('com_bawang_putih', 'Bawang Putih', 'Bumbu Dapur', 'kg', 1000, 'api'),
('com_cabai_merah', 'Cabai Merah Keriting', 'Bumbu Dapur', 'kg', 1000, 'api'),
('com_daging_sapi', 'Daging Sapi Segar', 'Daging & Unggas', 'kg', 1000, 'api'),
('com_gula', 'Gula Pasir', 'Gula', 'kg', 1000, 'api'),
('com_tepung', 'Tepung Terigu', 'Tepung', 'kg', 1000, 'seed'),
('com_kacang_hijau', 'Kacang Hijau', 'Kacang-kacangan', 'kg', 1000, 'seed'),
('com_pisang', 'Pisang Ambon Segar', 'Buah-buahan', 'sisir', 1200, 'seed'),
('com_papaya', 'Pepaya California', 'Buah-buahan', 'kg', 1000, 'seed'),
('com_tomat', 'Tomat Segar', 'Sayuran', 'kg', 1000, 'seed')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  gram_per_unit = EXCLUDED.gram_per_unit,
  source = EXCLUDED.source;

-- ------------------------------------------------------------------------------
-- 5. NILAI GIZI KOMODITAS PANGAN PER 100 GRAM (public.commodity_nutrition)
-- Sumber Data Resmi: Tabel Komposisi Pangan Indonesia (TKPI 2020) Kementerian Kesehatan RI
-- Kolom: Kalori (kkal), Protein (g), Zat Besi / Fe (mg), Zink / Zn (mg), Kalsium / Ca (mg)
-- ------------------------------------------------------------------------------
INSERT INTO public.commodity_nutrition (commodity_id, calories, protein, iron, zinc, calcium) VALUES
('com_lele', 105, 18.7, 1.0, 0.8, 15),
('com_hati_ayam', 261, 27.4, 15.8, 3.2, 118),
('com_telur', 154, 12.4, 3.0, 1.0, 86),
('com_tempe', 201, 20.8, 4.0, 1.7, 155),
('com_tahu', 80, 10.9, 3.4, 0.8, 223),
('com_kelor', 92, 5.1, 6.0, 0.6, 1077),
('com_bayam', 16, 0.9, 3.5, 0.4, 166),
('com_ayam', 298, 18.2, 1.5, 0.6, 14),
('com_gabus', 80, 16.2, 0.1, 0.4, 170),
('com_wortel', 36, 1.0, 1.0, 0.3, 45),
('com_beras', 357, 8.4, 1.8, 0.5, 147),
('com_minyak', 884, 0.0, 0.0, 0.0, 0),
('com_bawang_merah', 46, 1.5, 0.8, 0.2, 36),
('com_bawang_putih', 112, 4.5, 1.0, 0.4, 42),
('com_cabai_merah', 36, 1.0, 0.5, 0.2, 29),
('com_daging_sapi', 201, 18.8, 2.8, 5.2, 11),
('com_gula', 394, 0.0, 0.1, 0.0, 5),
('com_tepung', 333, 9.0, 1.3, 2.8, 22),
('com_kacang_hijau', 323, 22.9, 7.5, 2.9, 223),
('com_pisang', 108, 1.0, 0.2, 0.2, 20),
('com_papaya', 46, 0.5, 1.7, 0.3, 23),
('com_tomat', 24, 1.3, 0.6, 0.2, 8)
ON CONFLICT (commodity_id) DO UPDATE SET
  calories = EXCLUDED.calories,
  protein = EXCLUDED.protein,
  iron = EXCLUDED.iron,
  zinc = EXCLUDED.zinc,
  calcium = EXCLUDED.calcium;

-- ------------------------------------------------------------------------------
-- 6. HARGA PANGAN HARIAN PASAR LOKAL (public.daily_prices)
-- ------------------------------------------------------------------------------
INSERT INTO public.daily_prices (id, commodity_id, price, recorded_at, source) VALUES
('e0000001-0000-0000-0000-000000000001', 'com_lele', 26000, '2026-10-21', 'seed'),
('e0000002-0000-0000-0000-000000000002', 'com_hati_ayam', 32000, '2026-10-21', 'seed'),
('e0000003-0000-0000-0000-000000000003', 'com_telur', 1800, '2026-10-21', 'seed'),
('e0000004-0000-0000-0000-000000000004', 'com_tempe', 12000, '2026-10-21', 'seed'),
('e0000005-0000-0000-0000-000000000005', 'com_tahu', 8000, '2026-10-21', 'seed'),
('e0000006-0000-0000-0000-000000000006', 'com_kelor', 3000, '2026-10-21', 'seed'),
('e0000007-0000-0000-0000-000000000007', 'com_bayam', 3500, '2026-10-21', 'seed'),
('e0000008-0000-0000-0000-000000000008', 'com_ayam', 36000, '2026-10-21', 'seed'),
('e0000009-0000-0000-0000-000000000009', 'com_gabus', 45000, '2026-10-21', 'seed'),
('e0000010-0000-0000-0000-000000000010', 'com_wortel', 14000, '2026-10-21', 'seed'),
('e0000011-0000-0000-0000-000000000011', 'com_beras', 13500, '2026-10-21', 'seed'),
('e0000012-0000-0000-0000-000000000012', 'com_minyak', 16500, '2026-10-21', 'seed'),
('e0000013-0000-0000-0000-000000000013', 'com_bawang_merah', 32000, '2026-10-21', 'api'),
('e0000014-0000-0000-0000-000000000014', 'com_bawang_putih', 38000, '2026-10-21', 'api'),
('e0000015-0000-0000-0000-000000000015', 'com_cabai_merah', 42000, '2026-10-21', 'api'),
('e0000016-0000-0000-0000-000000000016', 'com_daging_sapi', 135000, '2026-10-21', 'api'),
('e0000017-0000-0000-0000-000000000017', 'com_gula', 17500, '2026-10-21', 'api'),
('e0000018-0000-0000-0000-000000000018', 'com_tepung', 12000, '2026-10-21', 'seed'),
('e0000019-0000-0000-0000-000000000019', 'com_kacang_hijau', 28000, '2026-10-21', 'seed'),
('e0000020-0000-0000-0000-000000000020', 'com_pisang', 18000, '2026-10-21', 'seed'),
('e0000021-0000-0000-0000-000000000021', 'com_papaya', 10000, '2026-10-21', 'seed'),
('e0000022-0000-0000-0000-000000000022', 'com_tomat', 12000, '2026-10-21', 'seed')
ON CONFLICT (id) DO UPDATE SET
  commodity_id = EXCLUDED.commodity_id,
  price = EXCLUDED.price,
  recorded_at = EXCLUDED.recorded_at,
  source = EXCLUDED.source;
