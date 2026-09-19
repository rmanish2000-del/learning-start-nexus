/**
 * Single source of truth for the customer-support address.
 *
 * Every user-facing "contact us" path across the product (public pages,
 * feedback, checkout, sign-in and transactional email) must use these helpers
 * so an obsolete address can never drift back into a journey.
 */
export const SUPPORT_EMAIL = "support@eduos.global";

export const SUPPORT_PHONE_DISPLAY = "+91 98508 20909";
export const SUPPORT_PHONE_HREF = "tel:+919850820909";

/**
 * Shown on automated/transactional email so recipients never reply into an
 * unmonitored mailbox.
 */
export const UNMONITORED_SENDER_NOTICE =
  `This message was sent from an unmonitored address — replies are not read. ` +
  `For help, write to ${SUPPORT_EMAIL}.`;

/** Builds a mailto link with an EduOS-prefixed subject and optional body. */
export function supportMailto(options?: { subject?: string; body?: string }): string {
  const params = new URLSearchParams();
  if (options?.subject) params.set("subject", `EduOS — ${options.subject}`);
  if (options?.body) params.set("body", options.body);
  const query = params.toString();
  return `mailto:${SUPPORT_EMAIL}${query ? `?${query}` : ""}`;
}

/**
 * Payment support link. The order reference travels in the subject and body so
 * the team can find the transaction without asking the parent for details.
 */
export function paymentSupportMailto(orderRef: string): string {
  return supportMailto({
    subject: `Payment help (order ${orderRef})`,
    body: `Order reference: ${orderRef}\n\nPlease describe what happened:\n`,
  });
}
