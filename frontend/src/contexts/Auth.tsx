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
  is_blind?: boolean; // Optional properties
  is_disabled?: boolean;
};

export const AuthContext = createContext({
  id: 0,
  name: "",
  isAdmin: false,
  authenticated: false,
  accessToken: "",
  is_blind: false, // Default
  is_disabled: false, // Default
  loading: true,
  authenticate: (user: User, token: string, isBlind: boolean, isDisabled: boolean) => {},
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
    is_blind: false, // Default
    is_disabled: false, // Default
    loading: true,
  });

  // Function to check authentication status
  const checkAuthentication = async () => {
    try {
      const res = await axios.post("/auth/check", {}, { withCredentials: true });

      const { user, accessToken } = res.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      authenticate(user, accessToken, user.is_blind, user.is_disabled);
    } catch (error) {
      console.error("Authentication failed:", error instanceof Error ? error.message : error);
      setAuthentication((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Load authentication state on page load
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("accessToken");

    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      authenticate(parsedUser, savedToken, parsedUser.is_blind, parsedUser.is_disabled);
    } else {
      checkAuthentication(); // Fallback if no saved session
    }
  }, []);

  // Authentication function
  const authenticate = (user: User, token: string, isBlind: boolean, isDisabled: boolean) => {
    setAuthentication({
      id: user.id,
      name: user.name,
      isAdmin: user.admin,
      authenticated: true,
      accessToken: token,
      is_blind: isBlind, // Persist is_blind status
      is_disabled: isDisabled, // Persist is_disabled status
      loading: false,
    });

    navigate("/"); // Redirect to home
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post("/auth/logout", {}, { withCredentials: true });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      setAuthentication({
        id: 0,
        name: "",
        isAdmin: false,
        authenticated: false,
        accessToken: "",
        is_blind: false,
        is_disabled: false,
        loading: false,
      });

      navigate("/login"); // Redirect to login
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
