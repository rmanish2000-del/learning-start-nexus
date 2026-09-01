REVOKE EXECUTE ON FUNCTION public.apply_question_verification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_stale_parent_orders(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_parent_orders(interval) TO service_role;