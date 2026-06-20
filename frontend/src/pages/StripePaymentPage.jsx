import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate } from "react-router-dom";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const readPaymentData = () => {
  try {
    return JSON.parse(sessionStorage.getItem("stripePayment")) || null;
  } catch {
    return null;
  }
};

function StripePaymentForm({ orderId, orderCode }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setError("");
    setIsSubmitting(true);
    const returnUrl = `${window.location.origin}/payment-result?provider=stripe&order_id=${orderId}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Không thể xác nhận thanh toán Stripe.");
      setIsSubmitting(false);
      return;
    }

    sessionStorage.removeItem("stripePayment");
    navigate(`/payment-result?provider=stripe&order_id=${orderId}`, {
      replace: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {isSubmitting ? "Đang xác nhận..." : `Thanh toán đơn ${orderCode}`}
      </button>
    </form>
  );
}

export default function StripePaymentPage() {
  const paymentData = readPaymentData();

  if (!stripePromise || !paymentData?.clientSecret || !paymentData?.orderId) {
    return (
      <div className="py-20 text-center text-sm font-medium text-red-600">
        Phiên thanh toán Stripe không hợp lệ hoặc đã hết hạn.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-gray-900">
          Thanh toán an toàn với Stripe
        </h1>
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: paymentData.clientSecret }}
        >
          <StripePaymentForm
            orderId={paymentData.orderId}
            orderCode={paymentData.orderCode}
          />
        </Elements>
      </div>
    </div>
  );
}
