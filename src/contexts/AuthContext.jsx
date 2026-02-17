import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Login against backend /api/auth/login
  const login = async (credentials) => {
    // Backend expects 'username' and 'password' in the request body.
    const payload = {
      username: credentials.username || credentials.email || credentials.user || "",
      password: credentials.password || "",
    };

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body.message || body.error || "Invalid username or password";
      throw new Error(message);
    }

    // On success the backend returns token and user DTO
    const userDto = body.user || body.userResponse || body.data || null;
    const token = body.token || body.accessToken || null;

    if (userDto) setUser(userDto);

    return { user: userDto, token, message: body.message };
  };

  // Register against backend /api/auth/register
  const registerUser = async (data) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body.message || body.error || `Server error (${res.status})`;
      throw new Error(message);
    }

    return { success: true, message: body.message || "Registration successful" };
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