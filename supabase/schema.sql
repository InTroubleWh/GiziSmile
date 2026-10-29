-- ==============================================================================
-- GiziSmile — Initial Database Migration & Schema Replication
-- Migration Timestamp: 20261029000000_init_gizismile_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'nutritionist', 'kader', 'parent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'child_gender') THEN
    CREATE TYPE public.child_gender AS ENUM ('male', 'female');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parent_relationship') THEN
    CREATE TYPE public.parent_relationship AS ENUM ('ayah', 'ibu', 'wali');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_request_status') THEN
    CREATE TYPE public.role_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_category') THEN
    CREATE TYPE public.recipe_category AS ENUM (
      'Stunting (TB/U)',
      'Wasting (BB/TB)',
      'Underweight (BB/U)',
      'Gizi Seimbang'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingredient_type') THEN
    CREATE TYPE public.ingredient_type AS ENUM ('calculated', 'additional');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES
-- ------------------------------------------------------------------------------

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.children
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender public.child_gender NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.children_parents (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.children_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship public.parent_relationship NOT NULL DEFAULT 'ibu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(child_id, parent_id)
);

-- Table: public.measurements
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL,
  age_months INTEGER NOT NULL CHECK (age_months >= 0 AND age_months <= 60),
  height_cm NUMERIC(5, 2) NOT NULL CHECK (height_cm >= 45.0 AND height_cm <= 120.0),
  weight_kg NUMERIC(4, 2) NOT NULL CHECK (weight_kg >= 1.5 AND weight_kg <= 35.0),
  zscore_hfa NUMERIC(5, 2),
  zscore_wfa NUMERIC(5, 2),
  zscore_wfh NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.commodities (Bahan pangan lokal)
CREATE TABLE IF NOT EXISTS public.commodities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  gram_per_unit NUMERIC(8, 2) NOT NULL DEFAULT 100,
  source TEXT DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.commodity_nutrition (Kandungan nutrisi per 100 gram - TKPI)
CREATE TABLE IF NOT EXISTS public.commodity_nutrition (
  commodity_id TEXT PRIMARY KEY REFERENCES public.commodities(id) ON DELETE CASCADE,
  calories NUMERIC(8, 2) NOT NULL DEFAULT 0,
  protein NUMERIC(8, 2) NOT NULL DEFAULT 0,
  iron NUMERIC(8, 2) NOT NULL DEFAULT 0,
  zinc NUMERIC(8, 2) NOT NULL DEFAULT 0,
  calcium NUMERIC(8, 2) NOT NULL DEFAULT 0,
  fat NUMERIC(8, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.daily_prices (Harga komoditas pasar harian)
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id TEXT NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL,
  recorded_at DATE NOT NULL,
  source TEXT DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.recipes (Katalog Resep Gizi Cerdas)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.recipe_category NOT NULL DEFAULT 'Gizi Seimbang',
  target_age_min_months INTEGER NOT NULL DEFAULT 6 CHECK (target_age_min_months >= 0),
  target_age_max_months INTEGER NOT NULL DEFAULT 59 CHECK (target_age_max_months <= 60),
  preparation_time_minutes INTEGER NOT NULL DEFAULT 30,
  servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 1),
  cost_per_serving NUMERIC(10, 2) NOT NULL DEFAULT 0,
  highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_age_range CHECK (target_age_max_months >= target_age_min_months)
);

-- Table: public.recipe_ingredients (Bahan dalam resep)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_type public.ingredient_type NOT NULL DEFAULT 'calculated',
  commodity_id TEXT REFERENCES public.commodities(id) ON DELETE SET NULL,
  ingredient_name TEXT,
  amount_description TEXT,
  quantity NUMERIC(8, 2) DEFAULT 1,
  unit_label TEXT DEFAULT 'unit',
  weight_grams NUMERIC(8, 2) DEFAULT 0,
  estimated_cost NUMERIC(10, 2) DEFAULT 0,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.role_requests (Permohonan perubahan peran ke admin)
CREATE TABLE IF NOT EXISTS public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL,
  reason TEXT NOT NULL,
  status public.role_request_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_children_region ON public.children(region);
CREATE INDEX IF NOT EXISTS idx_children_parents_child ON public.children_parents(child_id);
CREATE INDEX IF NOT EXISTS idx_children_parents_parent ON public.children_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_measurements_child_id ON public.measurements(child_id);
CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON public.measurements(measured_at);
CREATE INDEX IF NOT EXISTS idx_daily_prices_commodity ON public.daily_prices(commodity_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON public.recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON public.role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status);

-- ------------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Helper function to check role without recursion
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger to automatically create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      CASE
        WHEN NEW.email ILIKE '%kader%' THEN 'kader'::public.user_role
        WHEN NEW.email ILIKE '%gizi%' THEN 'nutritionist'::public.user_role
        ELSE 'parent'::public.user_role
      END
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC Procedure: review_role_request
CREATE OR REPLACE FUNCTION public.review_role_request(
  p_request_id UUID,
  p_decision TEXT
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_requested_role public.user_role;
  v_current_user_role public.user_role;
BEGIN
  SELECT role INTO v_current_user_role FROM public.profiles WHERE id = auth.uid();
  IF v_current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Administrator yang berhak menyetujui permohonan peran.';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Keputusan tidak valid: Gunakan approved atau rejected.';
  END IF;

  SELECT user_id, requested_role INTO v_user_id, v_requested_role
  FROM public.role_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permohonan peran tidak ditemukan atau sudah diproses sebelumnya.';
  END IF;

  UPDATE public.role_requests
  SET
    status = p_decision::public.role_request_status,
    reviewed_at = timezone('utc'::text, now()),
    reviewed_by = auth.uid()
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    UPDATE public.profiles
    SET role = v_requested_role, updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commodity_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6.2 CHILDREN POLICIES
DROP POLICY IF EXISTS "Children readable by staff and linked parents" ON public.children;
CREATE POLICY "Children readable by staff and linked parents"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
    OR EXISTS (
      SELECT 1 FROM public.children_parents cp
      WHERE cp.child_id = public.children.id AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert children" ON public.children;
CREATE POLICY "Staff can insert children"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

DROP POLICY IF EXISTS "Staff can update children" ON public.children;
CREATE POLICY "Staff can update children"
  ON public.children FOR UPDATE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  )
  WITH CHECK (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

DROP POLICY IF EXISTS "Staff can delete children" ON public.children;
CREATE POLICY "Staff can delete children"
  ON public.children FOR DELETE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

-- 6.3 CHILDREN_PARENTS POLICIES
DROP POLICY IF EXISTS "Children parents readable by staff and linked parent" ON public.children_parents;
CREATE POLICY "Children parents readable by staff and linked parent"
  ON public.children_parents FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
    OR parent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can manage children parents" ON public.children_parents;
CREATE POLICY "Staff can manage children parents"
  ON public.children_parents FOR ALL
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  )
  WITH CHECK (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

-- 6.4 MEASUREMENTS POLICIES
DROP POLICY IF EXISTS "Measurements viewable by staff or linked parents" ON public.measurements;
CREATE POLICY "Measurements viewable by staff or linked parents"
  ON public.measurements FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
    OR EXISTS (
      SELECT 1 FROM public.children_parents cp
      WHERE cp.child_id = public.measurements.child_id AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert measurements" ON public.measurements;
CREATE POLICY "Staff can insert measurements"
  ON public.measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

DROP POLICY IF EXISTS "Staff can delete measurements" ON public.measurements;
CREATE POLICY "Staff can delete measurements"
  ON public.measurements FOR DELETE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'nutritionist', 'kader')
  );

-- 6.5 COMMODITIES & NUTRITION & PRICES POLICIES
DROP POLICY IF EXISTS "Commodities read for authenticated and anon" ON public.commodities;
CREATE POLICY "Commodities read for authenticated and anon"
  ON public.commodities FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Commodity nutrition read for authenticated and anon" ON public.commodity_nutrition;
CREATE POLICY "Commodity nutrition read for authenticated and anon"
  ON public.commodity_nutrition FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Daily prices read for authenticated and anon" ON public.daily_prices;
CREATE POLICY "Daily prices read for authenticated and anon"
  ON public.daily_prices FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Staff can manage commodities" ON public.commodities;
CREATE POLICY "Staff can manage commodities"
  ON public.commodities FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'nutritionist'))
  WITH CHECK (public.get_current_role() IN ('admin', 'nutritionist'));

DROP POLICY IF EXISTS "Staff can manage daily prices" ON public.daily_prices;
CREATE POLICY "Staff can manage daily prices"
  ON public.daily_prices FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'nutritionist', 'kader'))
  WITH CHECK (public.get_current_role() IN ('admin', 'nutritionist', 'kader'));

-- 6.6 RECIPES & RECIPE INGREDIENTS POLICIES
DROP POLICY IF EXISTS "Recipes read by all" ON public.recipes;
CREATE POLICY "Recipes read by all"
  ON public.recipes FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Nutritionists and admin can insert recipes" ON public.recipes;
CREATE POLICY "Nutritionists and admin can insert recipes"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'nutritionist'));

DROP POLICY IF EXISTS "Creator or admin can update recipes" ON public.recipes;
CREATE POLICY "Creator or admin can update recipes"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (public.get_current_role() = 'admin' OR created_by = auth.uid())
  WITH CHECK (public.get_current_role() = 'admin' OR created_by = auth.uid());

DROP POLICY IF EXISTS "Creator or admin can delete recipes" ON public.recipes;
CREATE POLICY "Creator or admin can delete recipes"
  ON public.recipes FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'admin' OR created_by = auth.uid());

-- 6.7 RECIPE INGREDIENTS POLICIES
DROP POLICY IF EXISTS "Recipe ingredients read by all" ON public.recipe_ingredients;
CREATE POLICY "Recipe ingredients read by all"
  ON public.recipe_ingredients FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Staff can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Staff can manage recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  TO authenticated
  USING (
    public.get_current_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = public.recipe_ingredients.recipe_id AND r.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.get_current_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = public.recipe_ingredients.recipe_id AND r.created_by = auth.uid()
    )
  );

-- 6.8 ROLE REQUESTS POLICIES
DROP POLICY IF EXISTS "Users can read own role requests" ON public.role_requests;
CREATE POLICY "Users can read own role requests"
  ON public.role_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_current_role() = 'admin');

DROP POLICY IF EXISTS "Users can create role requests" ON public.role_requests;
CREATE POLICY "Users can create role requests"
  ON public.role_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own pending role requests" ON public.role_requests;
CREATE POLICY "Users can delete own pending role requests"
  ON public.role_requests FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.get_current_role() = 'admin');

