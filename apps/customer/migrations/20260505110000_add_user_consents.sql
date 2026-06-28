BEGIN;

CREATE TABLE IF NOT EXISTS public.user_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NULL,
  consent_type TEXT NOT NULL,
  consent_status TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_document TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  locale TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  session_id TEXT NULL,
  consent_text_snapshot TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ NULL,
  CONSTRAINT user_consents_type_check CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'marketing', 'line_notifications')),
  CONSTRAINT user_consents_status_check CHECK (consent_status IN ('granted', 'withdrawn', 'reaffirmed'))
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_email ON public.user_consents(email);
CREATE INDEX IF NOT EXISTS idx_user_consents_type_created_at ON public.user_consents(consent_type, created_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consents" ON public.user_consents;
CREATE POLICY "Users can read own consents"
ON public.user_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

COMMIT;