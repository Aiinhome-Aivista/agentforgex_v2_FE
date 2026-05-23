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

const EVENT_NAME = "agentforgex:process-reanalyzed";

/**
 * @param {string}   processKey   the key of the process the page is showing
 * @param {function} onReanalyzed callback invoked when a successful
 *                                re-analysis fires for THIS process.  Should
 *                                trigger a refetch.
 */
export function useReanalyzeListener(processKey, onReanalyzed) {
  useEffect(() => {
    if (!processKey || typeof onReanalyzed !== "function") return undefined;

    const handler = (e) => {
      const evtKey = e?.detail?.processKey;
      if (!evtKey || evtKey === processKey) {
        try {
          onReanalyzed(e?.detail || {});
        } catch (err) {
          console.warn("[useReanalyzeListener] callback threw:", err);
        }
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [processKey, onReanalyzed]);
}
