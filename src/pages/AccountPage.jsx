import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Layers,
  Database,
  ShoppingCart,
  Sparkles,
  Zap,
  Crown,
  Loader2,
  AlertCircle,
  ArrowRight,
  Plus,
  Minus,
  Receipt,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  mySubscription,
  getUsage,
  getConfig,
  createOrder,
  verifyOrder,
} from "../services/billingApi";
import { loadRazorpay } from "../utils/razorpay";
import DummyPaymentButton from "../components/billing/DummyPaymentButton";

const ICONS = { free: Sparkles, basic: Zap, premium: Crown };

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [sub, setSub] = useState(null);
  const [usage, setUsage] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState("");
  const [success, setOk] = useState("");

  const [packets, setPackets] = useState(1);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoad(true);
    setError("");
    try {
      const [s, u, c] = await Promise.all([
        mySubscription().catch(() => null),
        getUsage().catch(() => null),
        getConfig().catch(() => null),
      ]);
      setSub(s?.data || null);
      setUsage(u?.data || null);
      setConfig(c?.data || null);
    } catch (e) {
      setError(e.message || "Could not load account");
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const buyPackets = async () => {
    setError("");
    setOk("");
    setBusy(true);
    try {
      if (!config?.configured)
        throw new Error("Payments are not configured. Contact admin.");
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay.");

      const order = await createOrder({ kind: "addon", packets });
      if (!order.status)
        throw new Error(order.message || "Order creation failed");
      const o = order.data;

      const rzp = new window.Razorpay({
        key: o.key_id,
        amount: o.amount_minor,
        currency: o.currency,
        order_id: o.order_id,
        name: "AgentForgeX",
        description: `${packets} × +10 workspaces addon`,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#10b981" },
        handler: async (resp) => {
          try {
            const v = await verifyOrder({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            if (v.status) {
              setOk(`Added ${packets * 10} workspaces to your plan.`);
              await refresh();
              await reload();
            } else {
              setError(v.message || "Verification failed");
            }
          } catch (e) {
            setError(e.message || "Verification failed");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (r) => {
        setError(r?.error?.description || "Payment failed");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message || "Could not start checkout");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/40">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const planCode = sub?.plan_code || user?.plan || null;
  const Icon = ICONS[planCode] || Sparkles;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-black mb-1">Account & Billing</h1>
      <p className="text-white/40 text-sm mb-8">
        Signed in as <span className="text-white">{user?.email}</span>
      </p>

      {error && (
        <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-5 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Current plan */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-12 h-12 rounded-xl flex items-center justify-center
              ${
                planCode === "premium"
                  ? "bg-purple-500/20 text-purple-300"
                  : planCode === "basic"
                    ? "bg-brand-500/20 text-brand-400"
                    : "bg-white/10 text-white/70"
              }`}
            >
              <Icon size={22} />
            </span>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/40 flex items-center gap-2 mb-1">
                <span>Current plan</span>
                {sub?.remaining_days > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {sub?.remaining_days} {sub?.remaining_days === 1 ? "day" : "days"} left
                  </span>
                )}
              </div>

              <div className="text-2xl font-black">
                {sub?.plan_name ||
                  (planCode
                    ? planCode.charAt(0).toUpperCase() + planCode.slice(1)
                    : "No active plan")}
              </div>
              {sub?.period_end && (
                <div className="text-xs text-white/40 flex items-center gap-1.5 mt-1">
                  <CalendarDays size={12} />
                  Renews / expires on{" "}
                  {new Date(sub.period_end).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="btn-primary text-sm"
          >
            {sub ? "Change plan" : "Choose a plan"} <ArrowRight size={14} />
          </button>
        </div>

        {sub && (
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <Stat
              icon={Database}
              label="Datasize"
              value={
                sub.datasize_mb >= 1024
                  ? `${(sub.datasize_mb / 1024).toFixed(0)} GB`
                  : `${sub.datasize_mb} MB`
              }
            />
            <Stat
              icon={Layers}
              label="Workspaces"
              value={`${sub.workspaces + (sub.extra_workspaces || 0)}`}
              hint={
                sub.extra_workspaces ? `(+${sub.extra_workspaces} addon)` : null
              }
            />
            <Stat
              icon={Receipt}
              label="Last payment"
              value={`${sub.currency} ${Number(sub.amount).toFixed(2)}`}
            />
          </div>
        )}
      </div>

      {/* Addon packets — only for paid plans */}
      {sub && sub.plan_code !== "free" && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={16} className="text-brand-500" />
            <h2 className="font-bold">Add more workspaces</h2>
          </div>
          <p className="text-sm text-white/50 mb-5">
            Each packet adds{" "}
            <strong className="text-white">+10 workspaces</strong> to your
            current plan for <strong className="text-white">₹500</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setPackets((p) => Math.max(1, p - 1))}
                className="px-3 py-2 text-white/70 hover:text-white"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={packets}
                onChange={(e) =>
                  setPackets(
                    Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                  )
                }
                className="w-14 text-center bg-transparent outline-none font-bold tabular-nums"
              />
              <button
                onClick={() => setPackets((p) => Math.min(100, p + 1))}
                className="px-3 py-2 text-white/70 hover:text-white"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="text-sm text-white/60">
              {packets} packet{packets > 1 ? "s" : ""} = +{packets * 10}{" "}
              workspaces ·
              <span className="text-white font-semibold">
                {" "}
                ₹{packets * 500}
              </span>
            </div>

            <button
              onClick={buyPackets}
              disabled={busy}
              className={`ml-auto py-2.5 px-5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98]
                ${
                  busy
                    ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                    : "bg-brand-500 hover:bg-brand-400 text-black shadow-lg shadow-brand-500/20"
                }`}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing…
                </>
              ) : (
                <>Buy now</>
              )}
            </button>
            <DummyPaymentButton
              kind="addon"
              packets={packets}
              className="ml-2"
              onSuccess={async () => {
                setOk(`[Test] Added ${packets * 10} workspaces.`);
                await refresh();
                await reload();
              }}
            />
          </div>
        </div>
      )}

      {!sub && (
        <div className="card p-6 text-center">
          <p className="text-white/60 mb-4">
            You don't have an active plan yet.
          </p>
          <button onClick={() => navigate("/pricing")} className="btn-primary">
            Choose a plan <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-lg font-black mt-1">
        {value}{" "}
        {hint && (
          <span className="text-xs font-normal text-white/40">{hint}</span>
        )}
      </div>
    </div>
  );
}
