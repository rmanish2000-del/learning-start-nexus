-- Guardian consent: withdrawal support, keeping the append-only history.
-- Each row now records an action; the newest row is the current state.
ALTER TABLE public.guardian_consents
  ADD COLUMN action text NOT NULL DEFAULT 'granted'
  CHECK (action IN ('granted', 'revoked'));

COMMENT ON COLUMN public.guardian_consents.action IS
  'granted or revoked — history stays append-only; the latest row wins.';
