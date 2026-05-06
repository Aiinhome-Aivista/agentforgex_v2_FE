import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  listPlans,
  subscribeFree,
  createOrder,
  verifyOrder,
  getConfig,
} from "../services/billingApi";
import { loadRazorpay } from "../utils/razorpay";
import { PLAN_FEATURES, priceForCountry } from "../utils/planConfig";
import DummyPaymentButton from "../components/billing/DummyPaymentButton";

const ICONS = { free: Sparkles, basic: Zap, premium: Crown };
const ACCENT = {
  free: "border-white/10",
  basic: "border-brand-500/30 ring-1 ring-brand-500/20",
  premium: "border-purple-500/30 ring-1 ring-purple-500/20",
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const country = (user?.country || "IN").toUpperCase();

  const [plans, setPlans] = useState(null);
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      listPlans().catch(() => null),
      getConfig().catch(() => null),
    ]).then(([p, c]) => {
      console.log("Plans API Response:", p);
      console.log("Config API Response:", c);
      setPlans(p?.data || null);
      setConfig(c?.data || null);
    });
  }, []);

  const planList = useMemo(() => {
    // Prefer server data; fall back to local config so the page always renders.
    if (plans && plans.length) return plans.map(normaliseServerPlan);
    return Object.values(PLAN_FEATURES);
  }, [plans]);

  // ── Free plan activation ──────────────────────────────────────────────────
  const handleFree = async () => {
    setError("");
    setSuccess("");
    setBusy("free");
    try {
      const res = await subscribeFree();
      if (res.status) {
        setSuccess("Free trial activated. Redirecting…");
        await refresh();
        setTimeout(() => navigate("/home", { replace: true }), 700);
      } else {
        setError(res.message || "Could not activate free trial");
      }
    } catch (err) {
      setError(err.message || "Could not activate free trial");
    } finally {
      setBusy(null);
    }
  };

  // ── Razorpay paid checkout ────────────────────────────────────────────────
  const handlePaid = async (planCode) => {
    setError("");
    setSuccess("");
    setBusy(planCode);
    try {
      if (!config?.configured || !config?.razorpay_key_id) {
        throw new Error("Payments are not configured. Please contact admin.");
      }
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your network.");

      const order = await createOrder({
        kind: "subscription",
        plan_code: planCode,
        country,
      });
      if (!order.status)
        throw new Error(order.message || "Order creation failed");

      const o = order.data;
      const rzp = new window.Razorpay({
        key: o.key_id,
        amount: o.amount_minor,
        currency: o.currency,
        order_id: o.order_id,
        name: "AgentForgeX",
        description: `${planCode.charAt(0).toUpperCase() + planCode.slice(1)} subscription`,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: { color: "#10b981" },
        handler: async (response) => {
          try {
            const v = await verifyOrder({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (v.status) {
              setSuccess("Payment successful — your plan is active!");
              await refresh();
              setTimeout(() => navigate("/home", { replace: true }), 800);
            } else {
              setError(v.message || "Payment verification failed");
            }
          } catch (err) {
            setError(err.message || "Payment verification failed");
          } finally {
            setBusy(null);
          }
        },
        modal: {
          ondismiss: () => setBusy(null),
        },
      });
      rzp.on("payment.failed", (resp) => {
        setError(resp?.error?.description || "Payment failed");
        setBusy(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        {user?.plan && (
          <button
            onClick={() => navigate(-1)}
            className="text-white/50 hover:text-white text-sm mb-6 flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-5xl font-black">
            Choose your <span className="gradient-text">AgentForgeX</span> plan
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Start free, scale when you're ready. Switch or top-up workspaces any
            time.
          </p>
          <div className="inline-flex text-xs text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1">
            Pricing in {country === "IN" ? "₹ INR (India)" : "$ USD"}
          </div>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="max-w-xl mx-auto mb-6 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {planList.map((plan) => {
            const Icon = ICONS[plan.code] || Sparkles;
            const price = priceForCountry(plan, country);
            const isFree = plan.code === "free";
            const isCurrent = user?.plan === plan.code;
            const loading = busy === plan.code;

            return (
              <div
                key={plan.code}
                className={`card p-7 flex flex-col ${ACCENT[plan.code] || ACCENT.free}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center
                    ${
                      plan.code === "premium"
                        ? "bg-purple-500/20 text-purple-300"
                        : plan.code === "basic"
                          ? "bg-brand-500/20 text-brand-400"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      Current
                    </span>
                  )}
                </div>

                <div className="my-3">
                  <div className="text-4xl font-black tracking-tight">
                    {price.label}
                  </div>
                  <div className="text-xs text-white/40 mt-1.5 flex items-center flex-wrap gap-2">
                    <span>
                      {plan.period_days === 3
                        ? `${plan.period_days}-day trial`
                        : `per ${plan.period_days} days`}
                    </span>
                    {plan.remaining_days > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        {plan.remaining_days} {plan.remaining_days === 1 ? 'day' : 'days'} left
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mt-4 mb-6 text-sm">
                  <Feat>
                    Datasize:{" "}
                    <strong className="text-white">
                      {plan.datasize_label || `${plan.datasize_mb} MB`}
                    </strong>
                  </Feat>
                  <Feat>
                    Workspaces:{" "}
                    <strong className="text-white">{plan.workspaces}</strong>
                  </Feat>
                  {plan.addon_packet_inr ? (
                    <Feat>
                      Addon: ₹{plan.addon_packet_inr} for +10 workspaces
                    </Feat>
                  ) : null}
                  <Feat>Inputs: {(plan.inputs || []).join(", ")}</Feat>
                  {(plan.reports || []).map((r, i) => (
                    <Feat key={i}>{r}</Feat>
                  ))}
                  {plan.has_market_research && (
                    <Feat>Gartner & Nielson market research</Feat>
                  )}
                  {plan.has_deep_insights && <Feat>Deep Insights add-on</Feat>}
                </ul>

                <button
                  disabled={isCurrent || loading}
                  onClick={() =>
                    isFree ? handleFree() : handlePaid(plan.code)
                  }
                  className={`mt-auto w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                    ${
                      isCurrent
                        ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                        : isFree
                          ? "bg-white/10 hover:bg-white/15 border border-white/10"
                          : plan.code === "premium"
                            ? "bg-purple-500 hover:bg-purple-400 text-black shadow-lg shadow-purple-500/20"
                            : "bg-brand-500 hover:bg-brand-400 text-black shadow-lg shadow-brand-500/20"
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Working…
                    </>
                  ) : isCurrent ? (
                    "Active"
                  ) : isFree ? (
                    "Start free trial"
                  ) : (
                    `Pay ${price.label}`
                  )}
                </button>
                <DummyPaymentButton
                  kind="plan"
                  planCode={plan.code}
                  className="mt-2"
                  disabled={isCurrent}
                  onSuccess={async () => {
                    setSuccess(`[Test] ${plan.name} activated.`);
                    await refresh();
                    setTimeout(() => navigate("/home", { replace: true }), 700);
                  }}
                />
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-white/30 mt-10">
          Secure checkout by Razorpay. Taxes (where applicable) added at
          payment.
        </p>
      </div>
    </div>
  );
}

function Feat({ children }) {
  return (
    <li className="flex items-start gap-2 text-white/70">
      <Check size={14} className="mt-0.5 text-brand-500 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function normaliseServerPlan(p) {
  // Server returns features as JSON; merge with the static defaults.
  const fb = PLAN_FEATURES[p.code] || {};
  const sizeLabel = (() => {
    const mb = Number(p.datasize_mb || fb.datasize_mb || 50);
    return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
  })();
  return {
    ...fb,
    code: p.code,
    name: p.name,
    period_days: Number(p.period_days),
    price_inr: Number(p.price_inr),
    price_usd: Number(p.price_usd),
    workspaces: Number(p.workspaces),
    datasize_mb: Number(p.datasize_mb),
    datasize_label: sizeLabel,
    addon_packet_inr: p.addon_packet_inr ? Number(p.addon_packet_inr) : null,
    has_market_research: !!p.has_market_research,
    has_deep_insights: !!p.has_deep_insights,
    inputs: p.features?.inputs || fb.inputs || [],
    reports: p.features?.reports || fb.reports || [],
    remaining_days: p.remaining_days != null ? Number(p.remaining_days) : 0,
  };
}
