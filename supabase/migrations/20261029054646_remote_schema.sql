SET local check_function_bodies = off;

CREATE TABLE "public"."akg_references" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "age_group_code" text                     NOT NULL,
  "age_min_months" integer                  NOT NULL,
  "age_max_months" integer                  NOT NULL,
  "calories_kcal"  numeric(10,2)            NOT NULL,
  "protein_g"      numeric(10,2)            NOT NULL,
  "iron_mg"        numeric(10,3)            NOT NULL,
  "zinc_mg"        numeric(10,3)            NOT NULL,
  "calcium_mg"     numeric(10,2)            NOT NULL,
  "source"         text                     NOT NULL DEFAULT 'Permenkes No. 28 Tahun 2019'::text,
  "source_year"    integer                  NOT NULL DEFAULT 2019,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "fat_g"          numeric,
  CONSTRAINT "akg_references_age_group_code_key" UNIQUE (age_group_code),
  CONSTRAINT "akg_references_age_min_months_check" CHECK ((age_min_months >= 0)),
  CONSTRAINT "akg_references_age_range_unique" UNIQUE (age_min_months, age_max_months),
  CONSTRAINT "akg_references_calcium_mg_check" CHECK ((calcium_mg >= (0)::numeric)),
  CONSTRAINT "akg_references_calories_kcal_check" CHECK ((calories_kcal >= (0)::numeric)),
  CONSTRAINT "akg_references_check" CHECK ((age_max_months >= age_min_months)),
  CONSTRAINT "akg_references_iron_mg_check" CHECK ((iron_mg >= (0)::numeric)),
  CONSTRAINT "akg_references_pkey" PRIMARY KEY (id),
  CONSTRAINT "akg_references_protein_g_check" CHECK ((protein_g >= (0)::numeric)),
  CONSTRAINT "akg_references_zinc_mg_check" CHECK ((zinc_mg >= (0)::numeric))
);

ALTER TABLE "public"."akg_references"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."children_parents" (
  "child_id"     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "parent_id"    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "relationship" text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "children_parents_pkey" PRIMARY KEY (child_id, parent_id),
  CONSTRAINT "children_parents_relationship_check" CHECK ((relationship = ANY (ARRAY['ayah'::text, 'ibu'::text, 'wali'::text])))
);

ALTER TABLE "public"."children_parents"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."children" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "birth_date" date                     NOT NULL,
  "gender"     text                     NOT NULL,
  "region"     text                     NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "children_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text]))),
  CONSTRAINT "children_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."children"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commodities" (
  "id"            text    NOT NULL,
  "name"          text    NOT NULL,
  "category"      text    NOT NULL,
  "unit"          text    NOT NULL,
  "gram_per_unit" numeric NOT NULL,
  "source"        text    DEFAULT 'seed'::text,
  CONSTRAINT "commodities_pkey" PRIMARY KEY (id),
  CONSTRAINT "commodities_source_check" CHECK ((source = ANY (ARRAY['api'::text, 'seed'::text])))
);

ALTER TABLE "public"."commodities"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commodity_nutrition" (
  "commodity_id" text    NOT NULL,
  "calories"     numeric DEFAULT 0,
  "protein"      numeric DEFAULT 0,
  "iron"         numeric DEFAULT 0,
  "zinc"         numeric DEFAULT 0,
  "calcium"      numeric DEFAULT 0,
  "fat"          numeric,
  CONSTRAINT "commodity_nutrition_pkey" PRIMARY KEY (commodity_id)
);

ALTER TABLE "public"."commodity_nutrition"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."daily_prices" (
  "id"           uuid    NOT NULL DEFAULT gen_random_uuid(),
  "commodity_id" text    NOT NULL,
  "price"        numeric NOT NULL,
  "recorded_at"  date    NOT NULL,
  "source"       text    DEFAULT 'seed'::text,
  CONSTRAINT "daily_prices_pkey" PRIMARY KEY (id),
  CONSTRAINT "daily_prices_source_check" CHECK ((source = ANY (ARRAY['api'::text, 'seed'::text])))
);

ALTER TABLE "public"."daily_prices"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."measurements" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "child_id"    uuid                     NOT NULL,
  "measured_at" date                     NOT NULL,
  "age_months"  integer                  NOT NULL,
  "height_cm"   numeric                  NOT NULL,
  "weight_kg"   numeric                  NOT NULL,
  "zscore_hfa"  numeric,
  "zscore_wfa"  numeric,
  "zscore_wfh"  numeric,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "measurements_age_months_check" CHECK (((age_months >= 0) AND (age_months <= 60))),
  CONSTRAINT "measurements_height_cm_check" CHECK (((height_cm >= 45.0) AND (height_cm <= 120.0))),
  CONSTRAINT "measurements_pkey" PRIMARY KEY (id),
  CONSTRAINT "measurements_weight_kg_check" CHECK (((weight_kg >= 1.5) AND (weight_kg <= 35.0)))
);

ALTER TABLE "public"."measurements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "role"       text                     NOT NULL DEFAULT '''parent''::text'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'kader'::text, 'nutritionist'::text, 'parent'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recipe_ingredients" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "recipe_id"          uuid                     NOT NULL,
  "ingredient_type"    text                     NOT NULL,
  "commodity_id"       text,
  "quantity"           numeric(12,3),
  "unit_label"         text,
  "weight_grams"       numeric(12,2),
  "ingredient_name"    text,
  "amount_description" text,
  "estimated_cost"     numeric(12,2)            NOT NULL DEFAULT 0,
  "display_order"      integer                  NOT NULL DEFAULT 0,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recipe_ingredients_estimated_cost_check" CHECK ((estimated_cost >= (0)::numeric)),
  CONSTRAINT "recipe_ingredients_ingredient_type_check" CHECK ((ingredient_type = ANY (ARRAY['calculated'::text, 'additional'::text]))),
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY (id),
  CONSTRAINT "recipe_ingredients_valid_type" CHECK ((((ingredient_type = 'calculated'::text) AND (commodity_id IS NOT NULL) AND (quantity IS
    NOT NULL) AND (quantity > (0)::numeric) AND (unit_label IS NOT NULL) AND (length(TRIM(BOTH FROM unit_label)) > 0) AND (weight_grams IS
    NOT NULL) AND (weight_grams > (0)::numeric) AND (ingredient_name IS NULL) AND (amount_description IS NULL)) OR
    ((ingredient_type = 'additional'::text) AND (commodity_id IS NULL) AND (quantity IS NULL) AND (unit_label IS NULL) AND (weight_grams IS NULL) AND (ingredient_name IS
    NOT NULL) AND (length(TRIM(BOTH FROM ingredient_name)) > 0) AND (amount_description IS NOT NULL) AND (length(TRIM(BOTH FROM amount_description)) > 0))))
);

ALTER TABLE "public"."recipe_ingredients"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recipes" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"                    text                     NOT NULL,
  "category"                 text                     NOT NULL,
  "target_age_min_months"    integer                  NOT NULL,
  "target_age_max_months"    integer                  NOT NULL,
  "preparation_time_minutes" integer                  NOT NULL,
  "servings"                 integer                  NOT NULL DEFAULT 1,
  "cost_per_serving"         numeric(12,2)            NOT NULL DEFAULT 0,
  "highlights"               text[]                   NOT NULL DEFAULT '{}'::text[],
  "instructions"             text[]                   NOT NULL DEFAULT '{}'::text[],
  "created_by"               uuid                     NOT NULL,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recipes_category_check" CHECK ((category = ANY (ARRAY['Stunting (TB/U)'::text, 'Wasting (BB/TB)'::text, 'Underweight (BB/U)'::text, 'Gizi Seimbang'::text]))),
  CONSTRAINT "recipes_cost_per_serving_check" CHECK ((cost_per_serving >= (0)::numeric)),
  CONSTRAINT "recipes_pkey" PRIMARY KEY (id),
  CONSTRAINT "recipes_preparation_time_minutes_check" CHECK ((preparation_time_minutes > 0)),
  CONSTRAINT "recipes_servings_check" CHECK ((servings > 0)),
  CONSTRAINT "recipes_target_age_max_months_check" CHECK (((target_age_max_months >= 0) AND (target_age_max_months <= 60))),
  CONSTRAINT "recipes_target_age_min_months_check" CHECK (((target_age_min_months >= 0) AND (target_age_min_months <= 60))),
  CONSTRAINT "recipes_title_check" CHECK ((length(TRIM(BOTH FROM title)) > 0)),
  CONSTRAINT "recipes_valid_age_range" CHECK ((target_age_min_months <= target_age_max_months))
);

ALTER TABLE "public"."recipes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."role_requests" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid                     NOT NULL,
  "requested_role" text                     NOT NULL,
  "reason"         text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "reviewed_at"    timestamp with time zone,
  "reviewed_by"    uuid,
  CONSTRAINT "role_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "role_requests_requested_role_check" CHECK ((requested_role = ANY (ARRAY['nutritionist'::text, 'kader'::text, 'parent'::text]))),
  CONSTRAINT "role_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."role_requests"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."role_requests" FROM "anon";

CREATE OR REPLACE FUNCTION public.get_current_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'parent'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
  );
$function$;

REVOKE ALL ON FUNCTION "public"."is_current_user_admin"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.is_current_user_kader()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'kader'
    );
$function$;

CREATE OR REPLACE FUNCTION public.review_role_request (
  p_request_id uuid,
  p_decision   text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid;
  v_requested_role text;
BEGIN
  -- Pastikan pemanggil adalah admin.
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can review role requests';
  END IF;

  -- Validasi keputusan.
  IF p_decision IS NULL
     OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  -- Ambil dan kunci permohonan yang masih pending.
  SELECT rr.user_id, rr.requested_role
  INTO v_user_id, v_requested_role
  FROM public.role_requests AS rr
  WHERE rr.id = p_request_id
    AND rr.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending role request not found';
  END IF;

  -- Jika disetujui, ubah role pengguna.
  IF p_decision = 'approved' THEN
    UPDATE public.profiles
    SET role = v_requested_role
    WHERE id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
  END IF;

  -- Catat hasil peninjauan.
  UPDATE public.role_requests
  SET
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = (SELECT auth.uid())
  WHERE id = p_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."review_role_request"(uuid, text) FROM PUBLIC, "anon";

ALTER TABLE "public"."children_parents"
  ADD CONSTRAINT "children_parents_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."commodity_nutrition"
  ADD CONSTRAINT "commodity_nutrition_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE CASCADE;

ALTER TABLE "public"."daily_prices"
  ADD CONSTRAINT "daily_prices_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE CASCADE;

ALTER TABLE "public"."measurements"
  ADD CONSTRAINT "measurements_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."children_parents"
  ADD CONSTRAINT "children_parents_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_commodity_id_fkey" FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE RESTRICT;

ALTER TABLE "public"."recipes"
  ADD CONSTRAINT "recipes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE "public"."recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE "public"."role_requests"
  ADD CONSTRAINT "role_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."role_requests"
  ADD CONSTRAINT "role_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX akg_references_age_lookup_idx ON public.akg_references USING btree (age_min_months, age_max_months);

CREATE INDEX recipe_ingredients_commodity_id_idx ON public.recipe_ingredients USING btree (commodity_id);

CREATE INDEX recipe_ingredients_recipe_id_idx ON public.recipe_ingredients USING btree (recipe_id);

CREATE INDEX recipes_category_idx ON public.recipes USING btree (category);

CREATE INDEX recipes_created_by_idx ON public.recipes USING btree (created_by);

CREATE INDEX recipes_target_age_idx ON public.recipes USING btree (target_age_min_months, target_age_max_months);

CREATE UNIQUE INDEX role_requests_one_pending_per_user ON public.role_requests USING btree (user_id)
  WHERE (status = 'pending'::text);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Authenticated users can view AKG references" ON "public"."akg_references"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Admins can delete children" ON "public"."children"
  FOR DELETE
  TO "authenticated"
  USING ((public.get_current_role() = 'admin'::text));

CREATE POLICY "Role-based read children" ON "public"."children"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'kader'::text, 'nutritionist'::text]))))) OR (id IN ( SELECT cp.child_id
   FROM public.children_parents cp
  WHERE (cp.parent_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Staff can update children" ON "public"."children"
  FOR UPDATE
  TO "authenticated"
  USING ((public.get_current_role() = ANY (ARRAY['admin'::text, 'kader'::text, 'nutritionist'::text])))
  WITH CHECK ((public.get_current_role() = ANY (ARRAY['admin'::text, 'kader'::text, 'nutritionist'::text])));

CREATE POLICY "Staffs can insert children" ON "public"."children"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['kader'::text, 'nutritionist'::text, 'admin'::text]))))));

CREATE POLICY "Admins can read all children_parents" ON "public"."children_parents"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

CREATE POLICY "Kader and parents can read children_parents" ON "public"."children_parents"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'kader'::text)))) OR ((parent_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'parent'::text)))))));

CREATE POLICY "Nutritionists can read all children_parents" ON "public"."children_parents"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'nutritionist'::text)))));

CREATE POLICY "Staff can delete children_parents" ON "public"."children_parents"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'kader'::text]))))));

CREATE POLICY "Staff can insert children_parents" ON "public"."children_parents"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'kader'::text]))))));

CREATE POLICY "Staff can update children_parents" ON "public"."children_parents"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'kader'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'kader'::text]))))));

CREATE POLICY "Public read commodities" ON "public"."commodities"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public read nutrition" ON "public"."commodity_nutrition"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public read prices" ON "public"."daily_prices"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Authenticated read measurements" ON "public"."measurements"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Kader and nutritionist insert measurements" ON "public"."measurements"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['kader'::text, 'nutritionist'::text]))))));

CREATE POLICY "Kader can view parent profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((ROLE = 'parent'::text) AND ( SELECT public.is_current_user_kader() AS is_current_user_kader)));

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Users can view own profile or admins view all" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = id) OR ( SELECT public.is_current_user_admin() AS is_current_user_admin)));

CREATE POLICY "Admins and nutritionists can add recipe ingredients" ON "public"."recipe_ingredients"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))));

CREATE POLICY "Admins and nutritionists can delete recipe ingredients" ON "public"."recipe_ingredients"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))));

CREATE POLICY "Admins and nutritionists can update recipe ingredients" ON "public"."recipe_ingredients"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))));

CREATE POLICY "Authenticated users can view recipe ingredients" ON "public"."recipe_ingredients"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.recipes r
     JOIN public.profiles p ON ((p.id = ( SELECT auth.uid() AS uid))))
  WHERE ((r.id = recipe_ingredients.recipe_id) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text, 'kader'::text, 'parent'::text]))))));

CREATE POLICY "Admins and nutritionists can create recipes" ON "public"."recipes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text])))))));

CREATE POLICY "Admins and nutritionists can delete recipes" ON "public"."recipes"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))));

CREATE POLICY "Admins and nutritionists can update recipes" ON "public"."recipes"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text]))))));

CREATE POLICY "Authenticated users can view recipes" ON "public"."recipes"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin'::text, 'nutritionist'::text, 'kader'::text, 'parent'::text]))))));

CREATE POLICY "Admins can update role requests" ON "public"."role_requests"
  FOR UPDATE
  TO "authenticated"
  USING ((public.get_current_role() = 'admin'::text))
  WITH CHECK ((public.get_current_role() = 'admin'::text));

CREATE POLICY "Users can cancel own pending role requests" ON "public"."role_requests"
  FOR DELETE
  TO "authenticated"
  USING (((user_id = auth.uid()) AND (status = 'pending'::text)));

CREATE POLICY "Users can create own role request" ON "public"."role_requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL)));

CREATE POLICY "Users can view own role requests or admin view all" ON "public"."role_requests"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_current_user_admin() AS is_current_user_admin)));

COMMENT ON COLUMN "public"."commodity_nutrition"."calcium" IS 'in gram per 100 gram of commodity';

COMMENT ON COLUMN "public"."commodity_nutrition"."calories" IS 'in cal per 100 gram of commodity';

COMMENT ON COLUMN "public"."commodity_nutrition"."fat" IS 'in gram per 100 gram of commodity';

COMMENT ON COLUMN "public"."commodity_nutrition"."iron" IS 'in milligram per 100 gram of commodity';

COMMENT ON COLUMN "public"."commodity_nutrition"."protein" IS 'in gram per 100 gram of commodity';

COMMENT ON COLUMN "public"."commodity_nutrition"."zinc" IS 'in gram per 100 gram of commodity';

GRANT EXECUTE ON FUNCTION "public"."get_current_role"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_current_role"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_current_role"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_current_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_current_user_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."is_current_user_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_current_user_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_current_user_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_current_user_kader"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."is_current_user_kader"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_current_user_kader"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_current_user_kader"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_current_user_kader"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_role_request"(uuid, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."review_role_request"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_role_request"(uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_role_request"(uuid, text) TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."akg_references" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."akg_references" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."akg_references" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."akg_references" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."children" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children_parents" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."children_parents" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children_parents" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."children_parents" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodities" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."commodities" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodities" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodities" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodity_nutrition" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."commodity_nutrition" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodity_nutrition" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commodity_nutrition" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."daily_prices" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."daily_prices" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."daily_prices" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."daily_prices" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."measurements" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."measurements" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."measurements" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."measurements" TO "service_role";

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "anon";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

REVOKE ALL ("full_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("full_name") ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipe_ingredients" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."recipe_ingredients" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipe_ingredients" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipe_ingredients" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipes" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."recipes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipes" TO "service_role";

REVOKE ALL ON TABLE "public"."role_requests" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."role_requests" TO "authenticated";

REVOKE ALL ON TABLE "public"."role_requests" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."role_requests" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."role_requests" TO "service_role";

