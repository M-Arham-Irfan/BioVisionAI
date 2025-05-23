SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "plan_id" serial PRIMARY KEY,
    "name" character varying(50) NOT NULL,
    "stripe_price_id" character varying(100),
    "stripe_product_id" character varying(100),
    "price_usd" numeric(10,2) NOT NULL,
    "billing_interval" character varying(20) NOT NULL,
    "max_scans_per_day" integer NOT NULL,
    "features" jsonb
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "auth_id" uuid PRIMARY KEY,
    "full_name" character varying(100),
    "email" character varying(100) NOT NULL,
    "plan_id" integer REFERENCES "public"."subscription_plans"("plan_id") ON UPDATE CASCADE ON DELETE SET NULL,
    "stripe_customer_id" character varying(100),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "subscription_id" serial PRIMARY KEY,
    "auth_id" uuid NOT NULL REFERENCES "public"."users"("auth_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "plan_id" integer NOT NULL REFERENCES "public"."subscription_plans"("plan_id") ON UPDATE CASCADE ON DELETE RESTRICT,
    "stripe_subscription_id" character varying(100),
    "status" character varying(50) NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "payment_id" serial PRIMARY KEY,
    "auth_id" uuid NOT NULL REFERENCES "public"."users"("auth_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "subscription_id" integer REFERENCES "public"."subscriptions"("subscription_id") ON UPDATE CASCADE ON DELETE SET NULL,
    "stripe_payment_intent_id" character varying(100),
    "amount_usd" numeric(10,2) NOT NULL,
    "status" character varying(50) NOT NULL,
    "payment_method" character varying(50),
    "receipt_url" character varying(255),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";




CREATE TABLE IF NOT EXISTS "public"."patients" (
    "patient_id" serial PRIMARY KEY,
    "auth_id" uuid NOT NULL REFERENCES "public"."users"("auth_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "first_name" character varying(50),
    "last_name" character varying(50),
    "date_of_birth" date,
    "gender" character varying(10),
    "country" character varying(50),
    "city" character varying(50),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "scan_id" serial PRIMARY KEY,
    "auth_id" uuid NOT NULL REFERENCES "public"."users"("auth_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "patient_id" integer REFERENCES "public"."patients"("patient_id") ON UPDATE CASCADE ON DELETE SET NULL,
    "filename" character varying(255) NOT NULL,
    "storage_path" character varying(255) NOT NULL,
    "heatmap_storage_path" TEXT DEFAULT NULL,
    "file_size_kb" integer,
    "scan_type" character varying(50),
    "body_part" character varying(50),
    "performed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS public.scan_predictions (
    prediction_id serial PRIMARY KEY,
    scan_id integer NOT NULL REFERENCES public.scans(scan_id) ON UPDATE CASCADE ON DELETE CASCADE,
    predictions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.scan_predictions OWNER TO postgres;

-- Create unique constraint to ensure one prediction record per scan
ALTER TABLE ONLY public.scan_predictions
    ADD CONSTRAINT scan_predictions_scan_id_key UNIQUE (scan_id);

-- Enable row level security
ALTER TABLE public.scan_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view predictions for their scans" ON public.scan_predictions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.scans
    WHERE scans.scan_id = scan_predictions.scan_id
    AND scans.auth_id = (select auth.uid())
  ));

CREATE POLICY "Admins can view all scan predictions" ON public.scan_predictions
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can modify all scan predictions" ON public.scan_predictions
  FOR ALL USING (is_admin());

-- Create function to store scan predictions in JSON format
CREATE OR REPLACE FUNCTION store_scan_predictions(
    p_scan_id INTEGER,
    p_predictions JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scan_auth_id UUID;
BEGIN
    -- Check if the scan exists and get the auth_id
    SELECT auth_id INTO scan_auth_id FROM scans WHERE scan_id = p_scan_id;
    
    IF scan_auth_id IS NULL THEN
        RAISE EXCEPTION 'Scan with ID % does not exist', p_scan_id;
    END IF;
    
    -- Check if the user has permission to add predictions
    IF NOT ((select auth.uid()) = scan_auth_id OR (select is_admin())) THEN
        RAISE EXCEPTION 'Not authorized to add predictions for this scan';
    END IF;

    -- Insert or update predictions
    INSERT INTO scan_predictions (scan_id, predictions, created_at)
    VALUES (p_scan_id, p_predictions, CURRENT_TIMESTAMP)
    ON CONFLICT (scan_id) DO UPDATE
    SET predictions = p_predictions, created_at = CURRENT_TIMESTAMP;
END;
$$;

COMMENT ON FUNCTION store_scan_predictions(INTEGER, JSONB) IS 'Store AI model predictions for a scan in JSON format';

-- Function to get predictions for a specific scan
CREATE OR REPLACE FUNCTION get_scan_predictions(p_scan_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scan_auth_id UUID;
    result JSONB;
BEGIN
    -- Check if the scan exists and get the auth_id
    SELECT auth_id INTO scan_auth_id FROM scans WHERE scan_id = p_scan_id;
    
    IF scan_auth_id IS NULL THEN
        RAISE EXCEPTION 'Scan with ID % does not exist', p_scan_id;
    END IF;
    
    -- Check if the user has permission to view predictions
    IF NOT ((select auth.uid()) = scan_auth_id OR (select is_admin())) THEN
        RAISE EXCEPTION 'Not authorized to view predictions for this scan';
    END IF;
  
    -- Get the predictions
    SELECT predictions INTO result
    FROM scan_predictions
    WHERE scan_id = p_scan_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_scan_predictions(INTEGER) IS 'Get AI model predictions for a specific scan in JSON format';

-- Function to extract the top prediction from the JSON
CREATE OR REPLACE FUNCTION get_top_prediction(p_scan_id INTEGER)
RETURNS TABLE (
    disease_name TEXT,
    confidence NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scan_auth_id UUID;
    pred_json JSONB;
    top_pred JSONB;
BEGIN
    -- Check if the scan exists and get the auth_id
    SELECT auth_id INTO scan_auth_id FROM scans WHERE scan_id = p_scan_id;
    
    IF scan_auth_id IS NULL THEN
        RAISE EXCEPTION 'Scan with ID % does not exist', p_scan_id;
    END IF;
    
    -- Check if the user has permission to view predictions
    IF NOT ((select auth.uid()) = scan_auth_id OR (select is_admin())) THEN
        RAISE EXCEPTION 'Not authorized to view predictions for this scan';
    END IF;

    -- Get the predictions
    SELECT predictions INTO pred_json
    FROM scan_predictions
    WHERE scan_id = p_scan_id;
    
    -- If no predictions, return null
    IF pred_json IS NULL OR pred_json = '[]'::jsonb THEN
        RETURN;
    END IF;
    
    -- Get the top prediction (first element, assuming sorted by confidence)
    top_pred := pred_json->0;
    
    RETURN QUERY 
    SELECT 
        top_pred->>'disease_name' AS disease_name,
        (top_pred->>'confidence')::NUMERIC(5,2) AS confidence;
END;
$$;

COMMENT ON FUNCTION get_top_prediction(INTEGER) IS 'Get the top prediction (highest confidence) for a specific scan';

-- Grant permissions
GRANT EXECUTE ON FUNCTION store_scan_predictions(INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_predictions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_prediction(INTEGER) TO authenticated;

CREATE TABLE IF NOT EXISTS "public"."reports" (
    "report_id" serial PRIMARY KEY,
    "scan_id" integer NOT NULL REFERENCES "public"."scans"("scan_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "title" character varying(100) NOT NULL,
    "content" text,
    "created_by" uuid NOT NULL REFERENCES "public"."users"("auth_id") ON UPDATE CASCADE ON DELETE CASCADE,
    "shared_with" uuid[],
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."scans_view" WITH (security_invoker = on) AS
 SELECT s.scan_id,
    s.auth_id,
    s.patient_id,
    s.filename,
    s.storage_path,
    s.heatmap_storage_path,
    s.performed_at,
    u.email AS user_email
   FROM (public.scans s
     JOIN public.users u ON ((s.auth_id = u.auth_id)));



ALTER TABLE "public"."scans_view" OWNER TO "postgres";
COMMENT ON VIEW "public"."scans_view" IS 'View that joins scans with users';


-- Add unique constraints
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");

ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_name_billing_interval_key" UNIQUE ("name", "billing_interval");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_auth_id_plan_id_key" UNIQUE ("auth_id", "plan_id");

-- Create triggers to update the updated_at columns automatically
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON "public"."users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON "public"."subscriptions"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_patients_updated_at
BEFORE UPDATE ON "public"."patients"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO "public"."subscription_plans" ("name", "stripe_product_id", "stripe_price_id", "price_usd", "billing_interval", "max_scans_per_day", "features")
VALUES 
(
    'Free', 
    'prod_SGMea0M7THRxXF', 
    'price_1RLpupRCD7pqf33qvAUG999O', 
    0, 
    'monthly', 
    5, 
    '{"features": ["5 scans per month", "Basic disease detection", "Standard reporting", "30-day history", "Email support"]}'
),
(
    'Pro', 
    'prod_SGMfWMXCgp5E60', 
    'price_1RLpvoRCD7pqf33qo5FOvBqx', 
    12, 
    'monthly', 
    25, 
    '{"features": ["300 scans per month", "Advanced disease detection", "Detailed reporting", "90-day history", "Priority email support", "Export reports as PDF"]}'
),
(
    'Pro', 
    'prod_SGMhM99xyAySOx', 
    'price_1RLpy5RCD7pqf33qfAVBDdHl', 
    99, 
    'yearly', 
    25, 
    '{"features": ["300 scans per month", "Advanced disease detection", "Detailed reporting", "90-day history", "Priority email support", "Export reports as PDF"]}'
),
(
    'Enterprise', 
    'prod_SGMfmrFu59tkhL', 
    'price_1RLpwSRCD7pqf33qd24lZXbO', 
    49, 
    'monthly', 
    1000, 
    '{"features": ["Unlimited scans", "Advanced disease detection", "Comprehensive reporting", "Unlimited history", "24/7 phone & email support", "Advanced analytics", "Custom integrations", "API access"]}'
),
(
    'Enterprise', 
    'prod_SGMiLwutw5a0Nr', 
    'price_1RLpylRCD7pqf33q6woFpPLa', 
    399, 
    'yearly', 
    1000, 
    '{"features": ["Unlimited scans", "Advanced disease detection", "Comprehensive reporting", "Unlimited history", "24/7 phone & email support", "Advanced analytics", "Custom integrations", "API access"]}'
);

-- Function to count scans performed by a specific user on a specific date
CREATE OR REPLACE FUNCTION get_user_scan_count_by_date(user_auth_id uuid, scan_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    count_result integer;
BEGIN
    -- Ensure the caller is authorized to access this user's data
    IF (select auth.uid()) <> user_auth_id THEN
        RAISE EXCEPTION 'Not authorized to access this user''s data';
    END IF;

    SELECT 
        COUNT(*)
    INTO 
        count_result
    FROM 
        scans s
    WHERE 
        s.auth_id = user_auth_id AND
        DATE(s.performed_at) = scan_date;
    
    RETURN count_result;
END;
$$;

COMMENT ON FUNCTION get_user_scan_count_by_date(uuid, date) IS 'Get count of scans performed by a specific user on a specific date';


-- Function to get the total number of scans for a specific user
CREATE OR REPLACE FUNCTION get_scans_done_by_user(user_auth_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_count integer;
BEGIN
    -- Ensure the caller is authorized to access this user's data
    IF (select auth.uid()) <> user_auth_id THEN
        RAISE EXCEPTION 'Not authorized to access this user''s data';
    END IF;

    SELECT 
        COUNT(*)
    INTO 
        total_count
    FROM 
        scans
    WHERE 
        auth_id = user_auth_id;
    
    RETURN total_count;
END;
$$;

COMMENT ON FUNCTION get_scans_done_by_user(uuid) IS 'Get the total number of scans performed by a specific user';


-- Function to get the total number of scans for all users (counts only)
CREATE OR REPLACE FUNCTION get_all_users_scan_counts()
RETURNS TABLE (
    total_users bigint,
    total_scans bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(DISTINCT u.auth_id) AS total_users,
        COUNT(s.scan_id) AS total_scans
    FROM 
        users u
    LEFT JOIN 
        scans s ON u.auth_id = s.auth_id;
$$;

COMMENT ON FUNCTION get_all_users_scan_counts() IS 'Get the total number of scan count done by all users';

-- Function to safely create a user, handling potential conflicts
CREATE OR REPLACE FUNCTION create_user_safely(
  p_auth_id uuid,
  p_email text,
  p_full_name text,
  p_plan_id int DEFAULT NULL
) RETURNS SETOF users AS $$
DECLARE
  v_default_plan_id INT;
  v_error_message TEXT;
BEGIN
  -- Log function call for debugging
  RAISE NOTICE 'Creating user: auth_id=%, email=%, name=%', p_auth_id, p_email, p_full_name;
  
  -- First ensure we have default plans
  PERFORM ensure_default_plans();
  
  -- First try to find if the user already exists
  BEGIN
    PERFORM 1 FROM users WHERE auth_id = p_auth_id;
    
    -- If user doesn't exist, insert the new record
    IF NOT FOUND THEN
      -- If no plan_id was provided, find the default Free plan
      IF p_plan_id IS NULL THEN
BEGIN
          SELECT plan_id INTO v_default_plan_id
          FROM subscription_plans
          WHERE name = 'Free' AND billing_interval = 'monthly'
          LIMIT 1;
          
          IF v_default_plan_id IS NULL THEN
            RAISE NOTICE 'No Free plan found, creating without plan_id';
          ELSE
            RAISE NOTICE 'Using default Free plan: %', v_default_plan_id;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error finding default plan: %', SQLERRM;
          -- Continue without a plan_id
        END;
      ELSE
        v_default_plan_id := p_plan_id;
      END IF;
      
      -- Attempt to insert with robust error handling
      BEGIN
        RETURN QUERY
        INSERT INTO users (
          auth_id,
          email,
          full_name,
          plan_id,
          created_at
        ) VALUES (
          p_auth_id,
          p_email,
          p_full_name,
          COALESCE(v_default_plan_id, p_plan_id),
          NOW()
        )
        RETURNING *;
        
        RAISE NOTICE 'User created successfully: %', p_auth_id;
      EXCEPTION WHEN unique_violation THEN
        -- Another process may have created the user during this transaction
        RAISE NOTICE 'User already exists (concurrent creation): %', p_auth_id;
        RETURN QUERY SELECT * FROM users WHERE auth_id = p_auth_id;
      WHEN OTHERS THEN
        -- Log the error details but continue with fallback
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE WARNING 'Error creating user %: %', p_auth_id, v_error_message;
        
        -- Try a simplified insert without the plan_id as a fallback
BEGIN
          RETURN QUERY
          INSERT INTO users (auth_id, email, full_name, created_at)
          VALUES (p_auth_id, p_email, p_full_name, NOW())
          RETURNING *;
          
          RAISE NOTICE 'User created with fallback method: %', p_auth_id;
    EXCEPTION WHEN OTHERS THEN
          -- If all insert attempts fail, just return the user if they exist
          -- This could happen if the user was created by a trigger between our check and insert
          RAISE WARNING 'All creation attempts failed for %: %', p_auth_id, SQLERRM;
          RETURN QUERY SELECT * FROM users WHERE auth_id = p_auth_id;
        END;
      END;
    ELSE
      -- If user already exists, just return the existing record
      RAISE NOTICE 'User already exists, returning existing record: %', p_auth_id;
      RETURN QUERY
      SELECT * FROM users WHERE auth_id = p_auth_id;
  END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Handle any unexpected errors in the main block
    RAISE WARNING 'Unexpected error in create_user_safely: %', SQLERRM;
    -- Try to return the user if they exist, otherwise rethrow
    PERFORM 1 FROM users WHERE auth_id = p_auth_id;
    IF FOUND THEN
      RETURN QUERY SELECT * FROM users WHERE auth_id = p_auth_id;
    ELSE
      RAISE EXCEPTION 'Failed to create or find user: %', SQLERRM;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create default subscription plans if they don't exist
CREATE OR REPLACE FUNCTION ensure_default_plans() RETURNS void AS $$
DECLARE
  v_error_message TEXT;
  BEGIN
    -- Check if we have any subscription plans
    IF NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1) THEN
        BEGIN
            -- Insert default free plan
            INSERT INTO subscription_plans (
                name, 
                price_usd, 
                billing_interval, 
                max_scans_per_day, 
                features,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                'Free', 
                0, 
                'monthly', 
                5, 
                '["Basic scanning", "Standard reports"]'::jsonb,
                true,
                NOW(),
                NOW()
            );
            
            -- Insert default basic plan
            INSERT INTO subscription_plans (
                name, 
                price_usd, 
                billing_interval, 
                max_scans_per_day, 
                features,
                is_active,
      created_at, 
      updated_at
            ) VALUES (
                'Basic', 
                9.99, 
                'monthly', 
                20, 
                '["Unlimited scanning", "Advanced reports", "Priority support"]'::jsonb,
      true, 
      NOW(), 
      NOW()
    );
            
            -- Insert default pro plan
            INSERT INTO subscription_plans (
                name, 
                price_usd, 
                billing_interval, 
                max_scans_per_day, 
                features,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                'Pro', 
                19.99, 
                'monthly', 
                100, 
                '["Unlimited scanning", "Advanced reports", "Priority support", "Data export", "API access"]'::jsonb,
                true,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Default subscription plans created successfully';
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the function
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING 'Error creating default plans: %', v_error_message;
        END;
    ELSE
        RAISE NOTICE 'Default plans already exist, skipping creation';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
    default_plan_id INT;
    v_error_message TEXT;
BEGIN
    -- Call ensure_default_plans to make sure we have subscription plans
    PERFORM ensure_default_plans();
    
    BEGIN
        -- Get the default free plan ID
        SELECT plan_id INTO default_plan_id
        FROM subscription_plans
        WHERE name = 'Free' AND billing_interval = 'monthly'
        LIMIT 1;
        
        -- Create a user record with the new auth ID
        INSERT INTO users (auth_id, email, full_name, plan_id, created_at)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'full_name',
            default_plan_id,
            NOW()
        )
        ON CONFLICT (auth_id) DO NOTHING;
        
        RAISE NOTICE 'User created from auth trigger: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't prevent the auth user from being created
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE WARNING 'Error in handle_new_user trigger: %', v_error_message;
        
        -- Try a simplified insert as fallback
BEGIN
            INSERT INTO users (auth_id, email, full_name, created_at)
            VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'full_name',
                NOW()
            )
            ON CONFLICT (auth_id) DO NOTHING;
            
            RAISE NOTICE 'User created with fallback method: %', NEW.id;
EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Fallback creation also failed for %: %', NEW.id, SQLERRM;
            -- We don't want to block the auth.users insert, so just continue
        END;
    END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 


-- Function to handle user updates in the auth system
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the corresponding user in our custom users table
    UPDATE public.users
    SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        updated_at = CURRENT_TIMESTAMP
    WHERE auth_id = NEW.id;
    
  RETURN NEW;
END;
$$;

-- Create trigger on Supabase Auth users table for updates
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = (select auth.uid())
        AND raw_app_meta_data->>'is_admin' = 'true'
    );
END;
$$;

-- Enable row-level security on all tables
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scan_predictions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON "public"."users"
  FOR SELECT USING ((select auth.uid()) = auth_id);

CREATE POLICY "Users can update their own profile" ON "public"."users"
  FOR UPDATE USING ((select auth.uid()) = auth_id);

CREATE POLICY "Users can insert their own profile" ON "public"."users"
  FOR INSERT WITH CHECK ((select auth.uid()) = auth_id);

CREATE POLICY "Admins can view all user profiles" ON "public"."users"
  FOR SELECT USING ((select is_admin()));

CREATE POLICY "Admins can update all user profiles" ON "public"."users"
  FOR UPDATE USING ((select is_admin()));

CREATE POLICY "Admins can insert all user profiles" ON "public"."users"
  FOR INSERT WITH CHECK ((select is_admin()));

-- RLS Policies for subscription_plans table
CREATE POLICY "All authenticated users can view subscription plans" ON "public"."subscription_plans"
  FOR SELECT USING ((select auth.role()) = 'authenticated' OR (select is_admin()));

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions"
  FOR SELECT USING ((select auth.uid()) = auth_id);

CREATE POLICY "Admins can view and modify all subscriptions" ON "public"."subscriptions"
  FOR ALL USING ((select is_admin()));

-- RLS Policies for payment_history table
CREATE POLICY "Users can view their own payment history" ON "public"."payment_history"
  FOR SELECT USING ((select auth.uid()) = auth_id);

CREATE POLICY "Admins can view and modify payment history" ON "public"."payment_history"
  FOR ALL USING ((select is_admin()));

-- RLS Policies for patients table
-- Consolidated policies for users to manage their own patients
CREATE POLICY "Users can manage their own patients" ON "public"."patients"
  FOR ALL USING ((select auth.uid()) = auth_id);

-- Consolidated policy for admins
CREATE POLICY "Admins can manage all patients" ON "public"."patients"
  FOR ALL USING ((select is_admin()));

-- RLS Policies for scans table
-- Consolidated policies for users to manage their own scans
CREATE POLICY "Users can manage their own scans" ON "public"."scans"
  FOR ALL USING ((select auth.uid()) = auth_id);

-- Consolidated policy for admins
CREATE POLICY "Admins can manage all scans" ON "public"."scans"
  FOR ALL USING ((select is_admin()));

-- Function to get the total number of scans in the system
CREATE OR REPLACE FUNCTION get_total_scan_count()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.scans;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_total_scan_count() TO anon;
GRANT EXECUTE ON FUNCTION get_total_scan_count() TO authenticated;

-- RLS Policies for reports table
CREATE POLICY "Users can view their own reports or public reports" ON "public"."reports"
  FOR SELECT USING (
    created_by = (select auth.uid()) OR 
    (select auth.uid()) = ANY(shared_with) OR
    is_public = true
  );

-- Consolidated policy for users to manage their own reports
CREATE POLICY "Users can manage their own reports" ON "public"."reports"
  FOR INSERT WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own reports" ON "public"."reports"
  FOR UPDATE USING (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own reports" ON "public"."reports"
  FOR DELETE USING (created_by = (select auth.uid()));

-- Consolidated policy for admins
CREATE POLICY "Admins can manage all reports" ON "public"."reports"
  FOR ALL USING ((select is_admin()));

CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scans');

CREATE POLICY "Allow authenticated users to view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'scans' AND (select auth.uid()) = owner);

CREATE POLICY "Allow users to update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'scans' AND owner = (select auth.uid()));

CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'scans' AND owner = (select auth.uid()));

-- Grant public access to the get_all_users_scan_counts function since it only returns aggregate numbers
GRANT EXECUTE ON FUNCTION get_all_users_scan_counts() TO anon, authenticated;

-- Grant authenticated user access to functions that require authentication
GRANT EXECUTE ON FUNCTION get_user_scan_count_by_date(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scans_done_by_user(uuid) TO authenticated;

-- Add RLS policy for public access to aggregate scan count data
CREATE POLICY "Allow public access to aggregate scan statistics" ON "public"."scans"
  FOR SELECT USING (false);

-- Update scan_predictions policy to use (select auth.uid())
DROP POLICY IF EXISTS "Users can view predictions for their scans" ON public.scan_predictions;
CREATE POLICY "Users can view predictions for their scans" ON public.scan_predictions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.scans
    WHERE scans.scan_id = scan_predictions.scan_id
    AND scans.auth_id = (select auth.uid())
  ));

CREATE POLICY "Admins can view and modify all scan predictions" ON public.scan_predictions
  FOR ALL USING ((select is_admin()));

-- Additional policies to allow users to see their scan counts
CREATE OR REPLACE FUNCTION user_can_access_own_data(user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (select auth.uid()) = user_id OR (select is_admin());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant all authenticated users access to user-specific functions
GRANT EXECUTE ON FUNCTION user_can_access_own_data(uuid) TO authenticated;

-- Allow service role to execute all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
