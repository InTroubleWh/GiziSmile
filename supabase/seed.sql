SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict prWSrQK4zsfrtWhEQfOsnqD2WZbsf8g1U6875Uy6adAZsBC9Gaq3sPS6cuis8yA

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: akg_references; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."akg_references" ("id", "age_group_code", "age_min_months", "age_max_months", "calories_kcal", "protein_g", "iron_mg", "zinc_mg", "calcium_mg", "source", "source_year", "created_at", "fat_g") VALUES
	('06f05542-4329-4e98-8881-4b0c43013436', '0_5_months', 0, 5, 550.00, 9.00, 0.300, 1.100, 200.00, 'Permenkes No. 28 Tahun 2019', 2019, '2026-10-26 07:21:02.968239+00', 31),
	('fe470fc7-0a3f-4545-8954-7eac2baa6465', '6_11_months', 6, 11, 800.00, 15.00, 11.000, 3.000, 270.00, 'Permenkes No. 28 Tahun 2019', 2019, '2026-10-26 07:21:02.968239+00', 35),
	('ee23d29b-9afe-4099-9c2e-2dc2eb70d175', '12_36_months', 12, 36, 1350.00, 20.00, 7.000, 3.000, 650.00, 'Permenkes No. 28 Tahun 2019', 2019, '2026-10-26 07:21:02.968239+00', 45),
	('5abe92c4-0daf-448d-ae3e-9693576e9c7e', '37_72_months', 37, 72, 1400.00, 25.00, 10.000, 5.000, 1000.00, 'Permenkes No. 28 Tahun 2019', 2019, '2026-10-26 07:21:02.968239+00', 50);


--
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."children" ("id", "name", "birth_date", "gender", "region", "created_at") VALUES
	('c0000001-0000-0000-0000-000000000001', 'Ahmad Rizky Pratama', '2024-10-01', 'male', 'Desa Sukamaju', '2026-10-21 07:40:29.710542+00'),
	('c0000002-0000-0000-0000-000000000002', 'Bayu Nugroho', '2024-04-10', 'male', 'Desa Sukamaju', '2026-10-21 07:40:29.710542+00'),
	('c0000003-0000-0000-0000-000000000003', 'Citra Dewi', '2024-01-15', 'female', 'Desa Sukamaju', '2026-10-21 07:40:29.710542+00'),
	('c0000004-0000-0000-0000-000000000004', 'Siti Aisyah Nurfadilah', '2024-06-15', 'female', 'Desa Karanganyar', '2026-10-21 07:40:29.710542+00'),
	('c0000005-0000-0000-0000-000000000005', 'Daffa Alfarizi', '2023-11-20', 'male', 'Desa Karanganyar', '2026-10-21 07:40:29.710542+00'),
	('c0000006-0000-0000-0000-000000000006', 'Eka Putri Lestari', '2024-08-05', 'female', 'Desa Karanganyar', '2026-10-21 07:40:29.710542+00'),
	('c0000007-0000-0000-0000-000000000007', 'Budi Santoso', '2023-12-10', 'male', 'Kelurahan Cibiru', '2026-10-21 07:40:29.710542+00'),
	('c0000008-0000-0000-0000-000000000008', 'Fadhil Rahman', '2024-05-25', 'male', 'Kelurahan Cibiru', '2026-10-21 07:40:29.710542+00'),
	('c0000009-0000-0000-0000-000000000009', 'Dewi Lestari', '2024-02-20', 'female', 'Desa Mekarjaya', '2026-10-21 07:40:29.710542+00'),
	('c0000010-0000-0000-0000-000000000010', 'Gilang Ramadhan', '2023-09-14', 'male', 'Desa Mekarjaya', '2026-10-21 07:40:29.710542+00'),
	('c0000011-0000-0000-0000-000000000011', 'Hana Pertiwi', '2024-03-30', 'female', 'Desa Tanjungsari', '2026-10-21 07:40:29.710542+00'),
	('c0000012-0000-0000-0000-000000000012', 'Ihsan Maulana', '2023-10-18', 'male', 'Desa Tanjungsari', '2026-10-21 07:40:29.710542+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "role", "created_at") VALUES
	('012ef38b-8def-44ae-b34c-738fd504754a', 'Siti Rahayu (Kader Posyandu)', 'kader', '2026-10-21 07:30:10.050053+00'),
	('a56e5493-0dad-4d62-9234-5485e36e25b1', 'dr. Nurul Hidayah, Sp.GK (Ahli Gizi)', 'nutritionist', '2026-10-21 07:30:12.191266+00'),
	('436612fb-3098-45a8-957b-37feb440ec84', 'ortu', 'parent', '2026-10-21 07:48:57.677154+00'),
	('917eb563-bd4a-4a11-bacb-756158c8d1a6', 'Administrator', 'admin', '2026-10-24 09:33:31.679533+00');


--
-- Data for Name: children_parents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."children_parents" ("child_id", "parent_id", "relationship", "created_at") VALUES
	('c0000001-0000-0000-0000-000000000001', '436612fb-3098-45a8-957b-37feb440ec84', NULL, '2026-10-28 00:40:59.724067+00');


--
-- Data for Name: commodities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."commodities" ("id", "name", "category", "unit", "gram_per_unit", "source") VALUES
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
	('com_tomat', 'Tomat Segar', 'Sayuran', 'kg', 1000, 'seed');


--
-- Data for Name: commodity_nutrition; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."commodity_nutrition" ("commodity_id", "calories", "protein", "iron", "zinc", "calcium", "fat") VALUES
	('com_ayam', 298, 18.2, 1.5, 0.6, 14, 25),
	('com_bawang_merah', 46, 1.5, 0.8, 0.2, 36, 0.3),
	('com_bawang_putih', 112, 4.5, 1.0, 0.4, 42, 0.2),
	('com_bayam', 16, 0.9, 3.5, 0.4, 166, 0.4),
	('com_beras', 357, 8.4, 1.8, 0.5, 147, 3.8),
	('com_cabai_merah', 36, 1.0, 0.5, 0.2, 29, 0.3),
	('com_daging_sapi', 201, 18.8, 2.8, 5.2, 11, 14),
	('com_gabus', 80, 16.2, 0.1, 0.4, 170, 0.5),
	('com_gula', 394, 0.0, 0.1, 0.0, 5, 0.0),
	('com_hati_ayam', 261, 27.4, 15.8, 3.2, 118, 16.1),
	('com_kacang_hijau', 323, 22.9, 7.5, 2.9, 223, 2.1),
	('com_kelor', 92, 5.1, 6.0, 0.6, 1077, 1.6),
	('com_lele', 105, 18.7, 1.0, 0.8, 15, 5.5),
	('com_papaya', 46, 0.5, 1.7, 0.3, 23, 0.1),
	('com_pisang', 108, 1.0, 0.2, 0.2, 20, 0.8),
	('com_tahu', 80, 10.9, 3.4, 0.8, 223, 4.7),
	('com_telur', 154, 12.4, 3.0, 1.0, 86, 10.8),
	('com_tempe', 201, 20.8, 4.0, 1.7, 155, 8.8),
	('com_tepung', 333, 9.0, 1.3, 2.8, 22, 0.0),
	('com_tomat', 24, 1.3, 0.6, 0.2, 8, 0.5),
	('com_wortel', 36, 1.0, 1.0, 0.3, 45, 0.6),
	('com_minyak', 884, 0.0, 0.0, 0.0, 0.0, 100);


--
-- Data for Name: daily_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."daily_prices" ("id", "commodity_id", "price", "recorded_at", "source") VALUES
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
	('e0000022-0000-0000-0000-000000000022', 'com_tomat', 12000, '2026-10-21', 'seed');


--
-- Data for Name: measurements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."measurements" ("id", "child_id", "measured_at", "age_months", "height_cm", "weight_kg", "zscore_hfa", "zscore_wfa", "zscore_wfh", "created_at") VALUES
	('b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', '2026-10-15', 24, 80.5, 10.0, -2.39, -1.71, -0.64, '2026-10-21 07:40:29.710542+00'),
	('b0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', '2026-10-14', 30, 92.5, 13.6, -0.25, 0.12, 0.35, '2026-10-21 07:40:29.710542+00'),
	('b0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', '2026-10-12', 33, 84.0, 10.2, -3.15, -2.45, -0.95, '2026-10-21 07:40:29.710542+00'),
	('b0000004-0000-0000-0000-000000000004', 'c0000004-0000-0000-0000-000000000004', '2026-10-12', 28, 89.2, 12.8, 0.15, 0.28, 0.32, '2026-10-21 07:40:29.710542+00'),
	('b0000005-0000-0000-0000-000000000005', 'c0000005-0000-0000-0000-000000000005', '2026-10-11', 35, 96.0, 14.5, -0.10, 0.15, 0.25, '2026-10-21 07:40:29.710542+00'),
	('b0000006-0000-0000-0000-000000000006', 'c0000006-0000-0000-0000-000000000006', '2026-10-10', 26, 81.2, 10.1, -2.20, -1.80, -0.75, '2026-10-21 07:40:29.710542+00'),
	('b0000007-0000-0000-0000-000000000007', 'c0000007-0000-0000-0000-000000000007', '2026-10-10', 34, 88.0, 11.5, -2.52, -2.15, -0.92, '2026-10-21 07:40:29.710542+00'),
	('b0000008-0000-0000-0000-000000000008', 'c0000008-0000-0000-0000-000000000008', '2026-10-09', 29, 91.5, 13.0, -0.30, -0.15, 0.10, '2026-10-21 07:40:29.710542+00'),
	('b0000009-0000-0000-0000-000000000009', 'c0000009-0000-0000-0000-000000000009', '2026-10-08', 32, 93.0, 13.5, 0.22, 0.12, 0.05, '2026-10-21 07:40:29.710542+00'),
	('b0000010-0000-0000-0000-000000000010', 'c0000010-0000-0000-0000-000000000010', '2026-10-07', 37, 91.0, 12.2, -2.45, -2.10, -0.80, '2026-10-21 07:40:29.710542+00'),
	('b0000011-0000-0000-0000-000000000011', 'c0000011-0000-0000-0000-000000000011', '2026-10-05', 31, 92.0, 13.2, 0.05, 0.08, 0.12, '2026-10-21 07:40:29.710542+00'),
	('b0000012-0000-0000-0000-000000000012', 'c0000012-0000-0000-0000-000000000012', '2026-10-04', 36, 96.2, 14.2, -0.18, -0.05, 0.18, '2026-10-21 07:40:29.710542+00'),
	('628abeef-8a5b-40c5-a845-7d2761a8b303', 'c0000002-0000-0000-0000-000000000002', '2026-10-20', 24, 85, 11.1, -0.92, -0.79, -0.44, '2026-10-21 07:58:05.62131+00'),
	('b839526b-8dae-4c76-a4cc-0117c3d4a550', 'c0000001-0000-0000-0000-000000000001', '2026-10-22', 25, 82, 10.5, -2.15, -1.6, -0.55, '2026-10-22 00:35:51.384421+00'),
	('e1a610ed-265a-45dc-96a3-54b9f1685ebb', 'c0000001-0000-0000-0000-000000000001', '2026-10-28', 24, 85, 11, -0.92, -0.87, -0.55, '2026-10-28 01:39:43.75004+00'),
	('f118438e-bf9a-4096-9a90-dfd5c4285e54', 'c0000001-0000-0000-0000-000000000001', '2026-10-28', 24, 85, 11.5, -0.92, -0.48, 0, '2026-10-28 08:27:26.806532+00'),
	('0f8d246f-e94a-4199-9c5f-910b50b14b13', 'c0000001-0000-0000-0000-000000000001', '2026-10-28', 24, 85, 12, -0.92, -0.11, 0.52, '2026-10-28 08:31:19.667245+00');


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."recipes" ("id", "title", "category", "target_age_min_months", "target_age_max_months", "preparation_time_minutes", "servings", "cost_per_serving", "highlights", "instructions", "created_by", "created_at", "updated_at") VALUES
	('9f252215-c412-48c9-9e9d-96b814da6469', 'Resep Tes', 'Gizi Seimbang', 12, 59, 30, 1, 81810.00, '{"Tinggi zat gizi esensial dari bahan pangan lokal terjangkau"}', '{"Persiapkan bahan dan cuci bersih dengan air mengalir.","Kukus atau rebus hingga matang merata dan sajikan selagi hangat."}', 'a56e5493-0dad-4d62-9234-5485e36e25b1', '2026-10-26 08:26:31.634884+00', '2026-10-26 08:26:31.634884+00');


--
-- Data for Name: recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."recipe_ingredients" ("id", "recipe_id", "ingredient_type", "commodity_id", "quantity", "unit_label", "weight_grams", "ingredient_name", "amount_description", "estimated_cost", "display_order", "created_at") VALUES
	('6a9c044f-5f55-4f76-a804-409663a78baf', '9f252215-c412-48c9-9e9d-96b814da6469', 'calculated', 'com_gabus', 1.010, 'kg', 1010.00, NULL, NULL, 45450.00, 1, '2026-10-26 08:26:31.760884+00'),
	('87dec40e-26f1-470a-a818-3e12b72ac547', '9f252215-c412-48c9-9e9d-96b814da6469', 'calculated', 'com_ayam', 1.010, 'kg', 1010.00, NULL, NULL, 36360.00, 2, '2026-10-26 08:26:31.760884+00'),
	('765b0895-3768-42e5-abfe-ba704d77f23d', '9f252215-c412-48c9-9e9d-96b814da6469', 'additional', NULL, NULL, NULL, NULL, 'Air', '1/2 Cangkir', 0.00, 3, '2026-10-26 08:26:31.760884+00');


--
-- Data for Name: role_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."role_requests" ("id", "user_id", "requested_role", "reason", "status", "created_at", "reviewed_at", "reviewed_by") VALUES
	('3f9e8b5e-c94c-4d36-bcfb-001dfc450781', 'f4aa04d5-cb06-4ca6-b76b-7f6f53f73869', 'kader', 'Tes fitur permohonan', 'approved', '2026-10-25 08:19:04.072097+00', '2026-10-25 08:19:44.083057+00', '917eb563-bd4a-4a11-bacb-756158c8d1a6');


--
-- PostgreSQL database dump complete
--

-- \unrestrict prWSrQK4zsfrtWhEQfOsnqD2WZbsf8g1U6875Uy6adAZsBC9Gaq3sPS6cuis8yA

RESET ALL;
