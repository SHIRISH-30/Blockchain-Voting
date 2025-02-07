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
  is_blind?: boolean; // Optional is_blind property
  is_disabled?: boolean; // Optional is_disabled property
};

export const AuthContext = createContext({
  id: 0,
  name: "",
  isAdmin: false,
  authenticated: false,
  accessToken: "",
  is_blind: false, // Default value
  is_disabled: false, // Default value
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
    is_blind: false, // Default value
    is_disabled: false, // Default value
    loading: true,
  });

  const checkAuthentication = async () => {
    try {
      const res = await axios.post("/auth/check", {}, { withCredentials: true });
      console.log("Authentication successful:", res.data.user);
      console.log("auth Tsx me is_blind check ", res.data.user.is_blind);
      console.log("auth Tsx me is_disabled check ", res.data.user.is_disabled);

      authenticate(
        res.data.user,
        res.data.accessToken,
        res.data.user.is_blind,
        res.data.user.is_disabled
      ); // Pass is_blind & is_disabled here
    } catch (error) {
      console.error("Authentication failed:", error instanceof Error ? error.message : error);
      setAuthentication((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkAuthentication(); // Only call this once on initial render
  }, []);

  const authenticate = (user: User, token: string, isBlind: boolean, isDisabled: boolean) => {
    setAuthentication({
      id: user.id,
      name: user.name,
      isAdmin: user.admin,
      authenticated: true,
      accessToken: token,
      is_blind: isBlind, // Directly set the is_blind value
      is_disabled: isDisabled, // Directly set the is_disabled value
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
        is_disabled: false,
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
