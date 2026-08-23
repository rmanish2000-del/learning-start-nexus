UPDATE auth.users
SET confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    phone_change = '',
    phone_change_token = '',
    reauthentication_token = ''
WHERE (email LIKE '%@eduos.dev' OR email LIKE '%@student.eduos.local')
  AND (confirmation_token IS NULL OR recovery_token IS NULL OR email_change IS NULL
       OR email_change_token_new IS NULL OR email_change_token_current IS NULL
       OR phone_change IS NULL OR phone_change_token IS NULL OR reauthentication_token IS NULL);