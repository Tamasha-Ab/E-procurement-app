import { createContext, useContext, useState } from "react";
import { ROLES } from "../constants/roles";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // TEMP: fake logged-in user role
  const [user] = useState({
    name: "Damindi",
    role: ROLES.STAFF, // change role to test UI
  });

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
