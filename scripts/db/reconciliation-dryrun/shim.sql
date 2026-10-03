-- Minimal Supabase-shaped shim for migration dry-runs on a disposable
-- PostgreSQL. It stands in for the parts of the live platform the
-- reconciliation migration references (roles, auth schema, private helpers,
-- the tables it adds foreign keys to). It is NOT a schema baseline.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'educator', 'student', 'parent', 'reviewer');
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY, org_id uuid REFERENCES public.organizations(id), full_name text, phone text);
CREATE TABLE IF NOT EXISTS public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, PRIMARY KEY (user_id, role));
CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_ref text, subject text, status text NOT NULL DEFAULT 'draft',
  verification_state text NOT NULL DEFAULT 'unverified', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.question_auto_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  run_id uuid NOT NULL DEFAULT gen_random_uuid(), engine_version text NOT NULL DEFAULT 'v1.0.0',
  outcome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.pilot_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, contact_name text, notes text,
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.pilot_leads ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.pilot_invitations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = _role) $$;
CREATE OR REPLACE FUNCTION private.current_org_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid() $$;
CREATE OR REPLACE FUNCTION private.is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'educator'::public.app_role) $$;
CREATE OR REPLACE FUNCTION private.is_reviewer() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(auth.uid(), 'reviewer'::public.app_role) $$;
