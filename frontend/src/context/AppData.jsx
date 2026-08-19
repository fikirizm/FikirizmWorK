import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: async () => (await API.get("/bootstrap")).data,
  });

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);

  useEffect(() => {
    if (data?.workspaces?.length && !currentWorkspaceId) {
      setCurrentWorkspaceId(data.workspaces[0].id);
    }
  }, [data, currentWorkspaceId]);

  const memberMap = useMemo(() => {
    const m = {};
    (data?.members || []).forEach((u) => (m[u.user_id] = u));
    return m;
  }, [data]);

  const currentWorkspace = useMemo(
    () => (data?.workspaces || []).find((w) => w.id === currentWorkspaceId) || data?.workspaces?.[0],
    [data, currentWorkspaceId]
  );

  const projects = useMemo(
    () => (data?.projects || []).filter((p) => !currentWorkspace || p.workspace_id === currentWorkspace.id),
    [data, currentWorkspace]
  );

  const value = {
    loading: isLoading,
    org: data?.org,
    workspaces: data?.workspaces || [],
    allProjects: data?.projects || [],
    projects,
    members: data?.members || [],
    memberMap,
    currentWorkspace,
    currentWorkspaceId: currentWorkspace?.id,
    setCurrentWorkspaceId,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => useContext(AppDataContext);
