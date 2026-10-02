// Browser-side Razorpay Checkout loader. No keys live here: the key id and
// gateway order id both come from the server for the specific order.

export type CheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void; on: (event: string, cb: (payload: unknown) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Checkout failed to load.")));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Checkout failed to load.")), { once: true });
    if (!existing) {
      script.src = SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export type OpenCheckoutInput = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
};

/**
 * Opens Razorpay Checkout. Resolves with the handler payload on success,
 * resolves `null` when the parent dismisses the modal, rejects on failure.
 */
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<CheckoutSuccess | null> {
  const Razorpay = await loadScript();
  return new Promise<CheckoutSuccess | null>((resolve, reject) => {
    let settled = false;
    const rzp = new Razorpay({
      key: input.keyId,
      order_id: input.razorpayOrderId,
      amount: input.amountPaise,
      currency: "INR",
      name: "EduOS",
      description: input.description,
      prefill: input.prefill ?? {},
      notes: input.notes ?? {},
      theme: { color: "#4f46e5" },
      modal: {
        ondismiss: () => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        },
      },
      handler: (response: CheckoutSuccess) => {
        settled = true;
        resolve(response);
      },
    } as Record<string, unknown>);

    rzp.on("payment.failed", (payload: unknown) => {
      if (settled) return;
      settled = true;
      const description =
        (payload as { error?: { description?: string } } | null)?.error?.description ??
        "The payment was declined.";
      reject(new Error(description));
    });

    rzp.open();
  });
}
