import React, { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "../axios";

type ContextProps = {
  children: JSX.Element;
};

type User = {
  id: number;
  name: string;
  admin: boolean;
  is_blind?: boolean; // Added optional is_blind property
};

export const AuthContext = createContext({
  id: 0,
  name: "",
  isAdmin: false,
  authenticated: false,
  accessToken: "",
  is_blind: false, // Ensure default value
  loading: true,
  authenticate: (user: User, token: string, isBlind: boolean) => {},
  logout: () => {},
});

export default (props: ContextProps): JSX.Element => {
  const navigate = useNavigate();

  const [authentication, setAuthentication] = useState({
    id: 0,
    name: "",
    isAdmin: false,
    authenticated: false,
    accessToken: "",
    is_blind: false, // Default value
    loading: true,
  });

  const checkAuthentication = async () => {
    try {
      const res = await axios.post("/auth/check", {}, { withCredentials: true });
      console.log("Authentication successful:", res.data.user);
      console.log("auth Tsx me is blind check ",res.data.user.is_blind)
      authenticate(res.data.user, res.data.accessToken, res.data.user.is_blind); // Pass is_blind here
    } catch (error) {
      console.error("Authentication failed:", error instanceof Error ? error.message : error);
      setAuthentication((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkAuthentication(); // Only call this once on initial render
  }, []);

  const authenticate = (user: User, token: string, isBlind: boolean) => {
    setAuthentication({
      id: user.id,
      name: user.name,
      isAdmin: user.admin,
      authenticated: true,
      accessToken: token,
      is_blind: isBlind, // Directly set the is_blind value
      loading: false,
    });

    navigate("/"); // Redirect to home page
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout", {}, { withCredentials: true });

      setAuthentication({
        id: 0,
        name: "",
        isAdmin: false,
        authenticated: false,
        accessToken: "",
        is_blind: false,
        loading: false,
      });

      navigate("/"); // Redirect to login page
    } catch (error) {
      console.error("Logout failed:", error instanceof Error ? error.message : error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authentication,
        authenticate,
        logout,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};
