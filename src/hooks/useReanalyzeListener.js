/**
 * useReanalyzeListener.js
 *
 * Drop-in hook for AnalysisPage (or any page that displays the current
 * process data) to react when the chatbot triggers a re-analysis.
 *
 * Usage in AnalysisPage.jsx (or similar):
 *
 *   import { useReanalyzeListener } from "../hooks/useReanalyzeListener";
 *
 *   function AnalysisPage() {
 *     const { id } = useParams();
 *     const [data, setData] = useState(null);
 *
 *     const refetch = useCallback(async () => {
 *       const fresh = await getProcess(id);
 *       setData(fresh);
 *     }, [id]);
 *
 *     useEffect(() => { refetch(); }, [refetch]);
 *
 *     // ⬇️ One line — refreshes the page whenever the chatbot completes
 *     //   a successful re-analysis on the same process.
 *     useReanalyzeListener(id, refetch);
 *
 *     return <Layout data={data} />;
 *   }
 */

import { useEffect } from "react";

const EVENT_SUCCESS = "agentforgex:process-reanalyzed";
const EVENT_START = "agentforgex:process-reanalyzing";
const EVENT_FAILED = "agentforgex:process-reanalyze-failed";

/**
 * @param {string}                  processKey   the key of the process the page is showing
 * @param {function|object}         callbacks    either a single callback function for success,
 *                                               or an object with { onReanalyzed, onReanalyzing, onFailed }
 */
export function useReanalyzeListener(processKey, callbacks) {
  useEffect(() => {
    if (!processKey || !callbacks) return undefined;

    const onReanalyzed = typeof callbacks === "function" ? callbacks : callbacks.onReanalyzed;
    const onReanalyzing = typeof callbacks === "object" ? callbacks.onReanalyzing : null;
    const onFailed = typeof callbacks === "object" ? callbacks.onFailed : null;

    const handleSuccess = (e) => {
      const evtKey = e?.detail?.processKey;
      if (!evtKey || evtKey === processKey) {
        try {
          onReanalyzed?.(e?.detail || {});
        } catch (err) {
          console.warn("[useReanalyzeListener] success callback threw:", err);
        }
      }
    };

    const handleStart = (e) => {
      const evtKey = e?.detail?.processKey;
      if (!evtKey || evtKey === processKey) {
        try {
          onReanalyzing?.(e?.detail || {});
        } catch (err) {
          console.warn("[useReanalyzeListener] start callback threw:", err);
        }
      }
    };

    const handleFailed = (e) => {
      const evtKey = e?.detail?.processKey;
      if (!evtKey || evtKey === processKey) {
        try {
          onFailed?.(e?.detail || {});
        } catch (err) {
          console.warn("[useReanalyzeListener] failed callback threw:", err);
        }
      }
    };

    window.addEventListener(EVENT_SUCCESS, handleSuccess);
    window.addEventListener(EVENT_START, handleStart);
    window.addEventListener(EVENT_FAILED, handleFailed);

    return () => {
      window.removeEventListener(EVENT_SUCCESS, handleSuccess);
      window.removeEventListener(EVENT_START, handleStart);
      window.removeEventListener(EVENT_FAILED, handleFailed);
    };
  }, [processKey, callbacks]);
}
