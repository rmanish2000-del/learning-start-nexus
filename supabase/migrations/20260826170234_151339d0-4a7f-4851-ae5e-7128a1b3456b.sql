DROP POLICY IF EXISTS "Admins can update the organization" ON public.organizations;
CREATE POLICY "Admins can update their own organization"
ON public.organizations FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
);