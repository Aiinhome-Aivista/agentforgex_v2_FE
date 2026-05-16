import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Trash2,
  Loader2,
  FileText,
  ChevronRight,
  Plus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { listWorkspaces, deleteWorkspace } from "../services/workspaceApi";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await listWorkspaces();
      setItems(r?.data || []);
      setQuota(r?.quota || null);
    } catch (e) {
      setError(e?.message || "Could not load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (id) => {
    setPendingId(id);
    setError("");
    try {
      const r = await deleteWorkspace(id);
      if (r?.status) {
        setItems((prev) => prev.filter((x) => x.id !== id));
        if (r.quota) setQuota(r.quota);
      } else {
        setError(r?.message || "Could not delete workspace");
      }
    } catch (e) {
      setError(e?.message || "Could not delete workspace");
    } finally {
      setPendingId(null);
      setConfirmId(null);
    }
  };

  const atCap = quota && quota.allowed != null && quota.used >= quota.allowed;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-6 ml-1">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-brand-500" />
          <h1 className="text-xl font-bold text-white tracking-tight">
            Workspaces
          </h1>
        </div>

        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase
                     tracking-widest font-bold text-white/40 hover:text-white
                     px-2 py-1 rounded"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>



      {error && (
        <div
          className="mb-4 rounded-md border border-red-500/30
                        bg-red-500/10 px-3 py-2 text-xs text-red-300
                        flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 text-white/20">
          <Layers size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-sm">
            No workspaces yet. Run an analysis and click
            <span className="text-white/40"> "Save to Workspace"</span>.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 inline-flex items-center gap-1.5 text-[11px]
                       uppercase tracking-widest font-bold text-brand-400
                       hover:text-brand-300"
          >
            Start an analysis <ChevronRight size={12} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <div
              key={w.id}
              className="card p-5 flex items-center justify-between
                         hover:bg-white/[0.06] transition-colors"
            >
              <div
                onClick={() => navigate(`/workspaces/${w.id}`)}
                className="flex-1 min-w-0 cursor-pointer pr-4"
              >
                <p
                  className="font-bold text-white/90 truncate uppercase
                              tracking-tight"
                >
                  {w.name}
                </p>
                <p
                  className="text-[10px] uppercase font-black tracking-widest
                              text-white/30 mt-1"
                >
                  <FileText size={10} className="inline mr-1 -mt-0.5" />
                  {w.has_analysis ? "Saved analysis" : "Empty"}
                  {w.data_size_mb
                    ? ` · ${Number(w.data_size_mb).toFixed(2)} MB`
                    : ""}
                  {" · "}
                  {new Date(w.updated_at || w.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {confirmId === w.id ? (
                  <>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={pendingId === w.id}
                      className="text-[11px] uppercase font-bold tracking-widest
                                 px-2 py-1 rounded text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      disabled={pendingId === w.id}
                      className="text-[11px] uppercase font-bold tracking-widest
                                 px-3 py-1.5 rounded bg-red-500/80 hover:bg-red-500
                                 text-white inline-flex items-center gap-1.5
                                 disabled:opacity-50"
                    >
                      {pendingId === w.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Confirm
                    </button>
                  </>
                ) : (
                  <>
                    {/* <button
                      onClick={() => navigate(`/workspaces/${w.id}`)}
                      className="text-[11px] uppercase font-bold tracking-widest
                                 px-3 py-1.5 rounded border border-white/10
                                 bg-white/[0.04] hover:bg-white/[0.08] text-white/80"
                    >
                      Open
                    </button> */}
                    <button
                      onClick={() => setConfirmId(w.id)}
                      title="Delete workspace"
                      className="p-2 rounded text-white/40 hover:text-red-400
                                 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
