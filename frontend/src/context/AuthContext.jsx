import { createContext, useContext, useEffect, useState, useCallback } from "react";
import API, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await API.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    if (data.token) localStorage.setItem("fik_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await API.post("/auth/register", { email, password, name });
    if (data.token) localStorage.setItem("fik_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {}
    localStorage.removeItem("fik_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { formatApiError };
