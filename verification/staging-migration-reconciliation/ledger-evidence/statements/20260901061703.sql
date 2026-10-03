CREATE POLICY "payment_credentials_admin_insert" ON public.payment_credentials
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_credentials_admin_update" ON public.payment_credentials
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_credentials_admin_delete" ON public.payment_credentials
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));