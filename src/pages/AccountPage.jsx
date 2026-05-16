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

      {/* Simple Account Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
            <UserCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Account Status</p>
            <p className="text-lg font-bold text-white">Verified Member</p>
          </div>
        </div>
      </div>

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
