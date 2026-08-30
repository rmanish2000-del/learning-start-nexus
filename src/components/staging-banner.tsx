import { APP_ENV, ENV_LABEL, IS_PRODUCTION } from "@/lib/environment";

/**
 * Permanent, unmissable marker on every non-production deployment.
 * Renders nothing in production, so it can be mounted unconditionally.
 */
export function StagingBanner() {
  if (IS_PRODUCTION) return null;
  return (
    <div
      role="status"
      aria-label={`${ENV_LABEL[APP_ENV]} environment`}
      className="sticky top-0 z-[60] w-full bg-amber-500 px-3 py-1 text-center text-xs font-semibold tracking-wide text-amber-950"
    >
      {ENV_LABEL[APP_ENV]} · internal test data only · payments run in test mode · no real money
    </div>
  );
}
