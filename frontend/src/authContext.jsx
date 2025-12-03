// src/authContext.js
import { createContext, useContext, useState } from "react";
import { apiPost, apiGet } from "./services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [access, setAccess] = useState(() => localStorage.getItem("access"));
  const [refresh, setRefresh] = useState(() => localStorage.getItem("refresh"));

  // ------------ LOGIN ------------
  const login = async (userData, accessToken, refreshToken) => {
    // Save tokens immediately
    setAccess(accessToken);
    setRefresh(refreshToken);
    localStorage.setItem("access", accessToken);
    localStorage.setItem("refresh", refreshToken);

    // Fetch the REAL full user with profile picture
    const fullUser = await apiGet("/accounts/me/");

    setUser(fullUser);
    localStorage.setItem("user", JSON.stringify(fullUser));
  };

  // ------------ LOGOUT ------------
  const logout = async () => {
    const refresh = localStorage.getItem("refresh");
    if (refresh) {
      await apiPost("/accounts/logout/", { refresh });
    }

    localStorage.clear();
    setUser(null);
    setAccess(null);
    setRefresh(null);
  };

  return (
    <AuthContext.Provider value={{ user, access, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}