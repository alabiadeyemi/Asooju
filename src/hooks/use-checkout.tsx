import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const useCheckout = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const startCheckout = async (planName: string, _price?: string) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Opening secure checkout for ${planName}…`);

    try {
      const headers = await authHeaders();
      if (!headers) {
        toast.error("Please log in to subscribe", { id: toastId });
        window.location.href = "/auth/login?next=/pricing";
        return;
      }

      const plan = planName.toLowerCase().includes("pro") || planName.toLowerCase().includes("premium")
        ? "pro"
        : planName.toLowerCase();

      if (plan !== "pro") {
        toast.info("That plan doesn’t need checkout", { id: toastId });
        window.location.href = "/auth/signup";
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            data.hint ||
            "Checkout unavailable. Configure Stripe keys on the server."
        );
      }
      if (!data.url) throw new Error("No checkout URL returned");

      toast.success("Redirecting to Stripe…", { id: toastId });
      window.location.href = data.url;
    } catch (error: any) {
      toast.error("Checkout failed", {
        description: error.message,
        id: toastId,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openPortal = async () => {
    setIsProcessing(true);
    const toastId = toast.loading("Opening Stripe billing portal…");
    try {
      const headers = await authHeaders();
      if (!headers) {
        toast.error("Please log in", { id: toastId });
        return;
      }
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers,
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Portal unavailable");
      toast.dismiss(toastId);
      window.location.href = data.url;
    } catch (error: any) {
      toast.error("Could not open portal", {
        description: error.message,
        id: toastId,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { startCheckout, openPortal, isProcessing };
};
