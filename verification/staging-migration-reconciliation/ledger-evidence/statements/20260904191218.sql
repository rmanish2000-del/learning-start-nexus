CREATE TABLE public.pilot_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  parent_email text NOT NULL,
  learner_id uuid,
  subject text,
  days integer NOT NULL,
  reason text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid,
  grant_id uuid REFERENCES public.pilot_grants(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pilot_invitations TO service_role;

ALTER TABLE public.pilot_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX pilot_invitations_email_idx ON public.pilot_invitations (lower(parent_email));