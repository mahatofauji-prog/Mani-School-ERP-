import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out, object = logged in

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(false);
        return false;
      }
      const res = await api.get("/auth/me");
      if (res && res.data) {
        setUser(res.data);
        return res.data;
      }
      setUser(false);
      return false;
    } catch (err) {
      console.warn("Profile fetch failed", err);
      localStorage.removeItem("token");
      setUser(false);
      return false;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res && res.data && res.data.token) {
      localStorage.setItem("token", res.data.token);
      setUser(res.data);
      return res.data;
    }
    throw new Error("Invalid server response");
  };

  const pinLogin = async (email, pin) => {
    const res = await api.post("/auth/pin-login", { email, pin });
    if (res && res.data && res.data.token) {
      localStorage.setItem("token", res.data.token);
      setUser(res.data);
      return res.data;
    }
    throw new Error("Invalid server response");
  };

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(false);
  };

  const refreshMe = async () => {
    return await fetchProfile();
  };

  const apiError = (err) => {
    return err?.response?.data?.error || err?.message || "Authentication failed";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, pinLogin, logout, refreshMe, apiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
