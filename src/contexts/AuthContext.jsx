import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Login against backend /api/auth/login
  const login = async (credentials) => {
    const payload = {
      username: credentials.username || credentials.email || credentials.user || "",
      password: credentials.password || "",
    };

    console.debug("[AuthContext] sending login payload:", payload);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Read raw text first (some backends return plain text on errors)
    const text = await res.text().catch(() => "");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      body = null;
    }

    console.debug("[AuthContext] login response status:", res.status, "statusText:", res.statusText);
    console.debug("[AuthContext] login response body:", body, "rawText:", text);

    if (!res.ok) {
      const message = (body && (body.message || body.error)) || text || res.statusText || "Invalid username or password";
      throw new Error(message);
    }

    const userDto = (body && (body.user || body.userResponse || body.data)) || null;
    const token = (body && (body.token || body.accessToken)) || null;

    if (userDto) setUser(userDto);

    return { user: userDto, token, message: (body && body.message) || null };
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

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      registerUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

