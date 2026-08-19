import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtime(workspaceId) {
  const queryClient = useQueryClient();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;
    const base = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws");
    const token = localStorage.getItem("fik_token");
    const url = `${base}/api/ws/${workspaceId}${token ? `?token=${token}` : ""}`;
    let closed = false;
    let ws;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["ideas"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      };
    } catch {}
    return () => {
      closed = true;
      if (ws && ws.readyState <= 1) ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);
}
