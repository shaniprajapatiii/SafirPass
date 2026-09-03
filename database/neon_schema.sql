-- SafirPass PostgreSQL Schema for Neon Serverless Postgres
-- Pure relational DDL for Profiles, KYC Applications, Consent Requests, Emergency SOS Alerts, Geofences, and Audit Logs

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  nationality TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. KYC Applications Table (Passport OCR & Face Liveness)
CREATE TABLE IF NOT EXISTS public.kyc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  passport_expiry DATE,
  visa_type TEXT,
  visa_number TEXT,
  entry_date DATE,
  exit_date DATE,
  emergency_contact TEXT,
  stay_address TEXT,
  blood_group TEXT,
  liveness_passed BOOLEAN NOT NULL DEFAULT false,
  liveness_score DOUBLE PRECISION DEFAULT 0.98,
  passport_doc_url TEXT,
  device_seal_hash TEXT,
  status TEXT NOT NULL DEFAULT 'under_review',
  tourist_id TEXT UNIQUE NOT NULL,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  ocr_at TIMESTAMPTZ DEFAULT now(),
  liveness_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Consent Requests Table (Data Siloing & Third-Party Verification)
CREATE TABLE IF NOT EXISTS public.consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requester TEXT NOT NULL,
  requester_type TEXT NOT NULL DEFAULT 'hotel',
  attributes TEXT[] NOT NULL DEFAULT '{}',
  shared_attributes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Emergency SOS Alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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
