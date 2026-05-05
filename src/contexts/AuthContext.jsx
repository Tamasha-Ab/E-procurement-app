import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();
const AUTH_STORAGE_KEY = "astraea_auth";

const readStoredAuth = () => {
  try {
    const persistedRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (persistedRaw) {
      return { ...JSON.parse(persistedRaw), persistence: "local" };
    }

    const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return sessionRaw ? { ...JSON.parse(sessionRaw), persistence: "session" } : null;
  } catch (error) {
    console.warn("[AuthContext] failed to read stored auth", error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const storedAuth = readStoredAuth();
  const [user, setUser] = useState(storedAuth?.user || null);
  const [token, setToken] = useState(storedAuth?.token || null);
  const [rememberMe, setRememberMe] = useState(storedAuth?.persistence !== "session");

  const persistAuth = (nextUser, nextToken, shouldRemember = true) => {
    setUser(nextUser);
    setToken(nextToken);
    setRememberMe(shouldRemember);

    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);

    if (nextUser && nextToken) {
      const storage = shouldRemember ? localStorage : sessionStorage;
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: nextUser,
        token: nextToken,
      }));
      return;
    }
  };

  const parseResponse = async (res) => {
    const text = await res.text().catch(() => "");
    let body = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch (error) {
      body = null;
    }

    if (!res.ok) {
      const message = (body && (body.message || body.error)) || text || res.statusText || "Request failed";
      throw new Error(message);
    }

    const userDto = (body && (body.user || body.userResponse || body.data)) || null;
    const authToken = (body && (body.token || body.accessToken)) || null;
    return { body, userDto, token: authToken };
  };

  // Login against backend /api/auth/login
  const login = async (credentials) => {
    const payload = {
      email: credentials.email || credentials.username || credentials.user || "",
      password: credentials.password || "",
    };

    console.debug("[AuthContext] sending login payload:", payload);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { body, userDto, token: authToken } = await parseResponse(res);

    console.debug("[AuthContext] login response status:", res.status, "statusText:", res.statusText);
    console.debug("[AuthContext] login response body:", body);

    if (userDto && authToken) {
      persistAuth(userDto, authToken, credentials.rememberMe !== false);
    }

    return { user: userDto, token: authToken, message: (body && body.message) || null };
  };

  const googleLogin = async (idToken) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const { body, userDto, token: authToken } = await parseResponse(res);

    if (userDto && authToken) {
      persistAuth(userDto, authToken, true);
    }

    return { user: userDto, token: authToken, message: (body && body.message) || null };
  };

  const googleRegister = async (payload) => {
    const res = await fetch("/api/auth/register/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const { body, userDto, token: authToken } = await parseResponse(res);

    if (userDto && authToken) {
      persistAuth(userDto, authToken);
    }

    return { user: userDto, token: authToken, message: (body && body.message) || null };
  };

  // Register against backend /api/auth/register
  const registerUser = async (data) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const text = await res.text().catch(() => "");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      body = null;
    }

    if (!res.ok) {
      const message = (body && (body.message || body.error)) || text || `Server error (${res.status})`;
      throw new Error(message);
    }

    return { success: true, message: (body && body.message) || "Registration successful" };
  };

  const forgotPassword = async (email) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const { body } = await parseResponse(res);
    return {
      message: body?.message || "Reset token generated.",
      resetToken: body?.data?.resetToken || "",
      expiresAt: body?.data?.expiresAt || null,
    };
  };

  const resetPassword = async (resetToken, newPassword) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword }),
    });

    const { body } = await parseResponse(res);
    return { message: body?.message || "Password reset successful" };
  };

  const logout = () => persistAuth(null, null, true);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      rememberMe,
      isAuthenticated: !!user && !!token,
      login,
      googleLogin,
      googleRegister,
      registerUser,
      forgotPassword,
      resetPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

