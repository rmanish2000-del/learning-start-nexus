REVOKE EXECUTE ON FUNCTION public.apply_question_verification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_parent_orders(interval) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_parent_orders(interval) TO service_role;