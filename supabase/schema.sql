-- SafirPass Database Schema for PostgreSQL / Supabase
-- Production DDL for Profiles, KYC Applications, Consent Requests, Emergency SOS Alerts, Geofences, and Audit Logs

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  nationality TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. KYC Applications Table (Passport OCR & Face Liveness)
CREATE TABLE IF NOT EXISTS public.kyc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  passport_expiry DATE,
  visa_type TEXT,
  visa_number TEXT,
  entry_date DATE,
  exit_date DATE,
  emergency_contact TEXT,
  liveness_passed BOOLEAN NOT NULL DEFAULT false,
  liveness_score DOUBLE PRECISION DEFAULT 0.98,
  passport_doc_url TEXT,
  device_seal_hash TEXT,
  status TEXT NOT NULL DEFAULT 'verified',
  tourist_id TEXT UNIQUE NOT NULL,
  ocr_at TIMESTAMPTZ DEFAULT now(),
  liveness_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ DEFAULT now(),
  issued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_applications TO authenticated;
GRANT ALL ON public.kyc_applications TO service_role;
ALTER TABLE public.kyc_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own kyc" ON public.kyc_applications;
CREATE POLICY "Users manage own kyc" ON public.kyc_applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Consent Requests Table (Data Siloing & Third-Party Verification)
CREATE TABLE IF NOT EXISTS public.consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  requester TEXT NOT NULL,
  requester_type TEXT NOT NULL DEFAULT 'hotel',
  attributes TEXT[] NOT NULL DEFAULT '{}',
  shared_attributes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_requests TO authenticated;
GRANT ALL ON public.consent_requests TO service_role;
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own consents" ON public.consent_requests;
CREATE POLICY "Users manage own consents" ON public.consent_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Emergency SOS Alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address_text TEXT,
  notes TEXT,
  responder TEXT,
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_alerts TO authenticated;
GRANT ALL ON public.sos_alerts TO service_role;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own alerts" ON public.sos_alerts;
CREATE POLICY "Users view own alerts" ON public.sos_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users/authorities to view and update alerts for command center dispatch
DROP POLICY IF EXISTS "Authorities view all alerts" ON public.sos_alerts;
CREATE POLICY "Authorities view all alerts" ON public.sos_alerts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authorities update alerts" ON public.sos_alerts;
CREATE POLICY "Authorities update alerts" ON public.sos_alerts FOR UPDATE TO authenticated USING (true);

-- 5. Geofences Table (Spatial Safety Grid)
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'restricted',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 500,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.geofences TO authenticated;
GRANT ALL ON public.geofences TO service_role;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read geofences" ON public.geofences;
CREATE POLICY "Public read geofences" ON public.geofences FOR SELECT TO authenticated USING (true);

-- Initial Geofence Seeds
INSERT INTO public.geofences (name, category, latitude, longitude, radius_meters, description) VALUES
('Red Fort Restricted Border Zone', 'restricted', 28.6562, 77.2410, 600, 'Border zone restricted during national events'),
('Taj Ganj Scam Advisory Zone', 'scam_hotspot', 27.1751, 78.0421, 800, 'Frequent unauthorized guides and fake ticket vendors reported'),
('Baga Beach Night Hazard Area', 'hazard', 15.5524, 73.7517, 1000, 'Strong tidal currents and unlit coastal stretches after sunset')
ON CONFLICT DO NOTHING;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS kyc_updated_at ON public.kyc_applications;
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sos_alerts_updated_at ON public.sos_alerts;
CREATE TRIGGER update_sos_alerts_updated_at BEFORE UPDATE ON public.sos_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New user profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'International Tourist'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
