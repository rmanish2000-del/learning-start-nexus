// /sme-review lands on the Mathematics queue; each subject has its own URL.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sme-review/")({
  beforeLoad: () => {
    throw redirect({ to: "/sme-review/$subject", params: { subject: "mathematics" } });
  },
  component: () => null,
});
