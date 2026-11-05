import { useCallback, useEffect, useRef, useState } from "react";
import { PORTFOLIO_EVENT } from "@/mocks/portfolio-store";

/**
 * Loads data from a service with loading / error states and refetches when deps change
 * or when portfolio data is edited anywhere in the app. Background refreshes keep old data on screen.
 */
export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    setError(false);
    let live = true;
    loadRef.current().then((d) => live && setData(d)).catch(() => live && setError(true)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => run(), deps);
  useEffect(() => {
    const on = () => run(true);
    window.addEventListener(PORTFOLIO_EVENT, on);
    return () => window.removeEventListener(PORTFOLIO_EVENT, on);
  }, [run]);

  return { data, loading: loading && data === null, refreshing: loading, error, reload: () => run() };
}
