import React, { useState, useContext } from "react";
import { useNavigate } from "react-router";
import { Formik } from "formik";
import { RouteProps } from "react-router";
import LoginLayout from "../layouts/Login";
import * as Yup from "yup";
import axios from "../axios";
import { AuthContext } from "../contexts/Auth";

// Validation schema for Formik
const schema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(3).required("Required"),
});

const Login = (props: RouteProps): JSX.Element => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext); // Access authentication context

  const [error, setError] = useState<any>("");
  console.log("Auth context in login ", authContext);

  return (
    <div>
      <LoginLayout error={error}>
        <div className="form-container">
          <Formik
            initialValues={{
              email: "",
              password: "",
            }}
            validationSchema={schema}
            onSubmit={(values) => {
              // Attempt to login
              axios
                .post("/auth/login", { ...values })
                .then((res) => {
                  console.log("Res.data, is_blind in login.tsx ", res.data.user.is_blind);
                  console.log("Res.data, is_disabled in login.tsx ", res.data.user.is_disabled);

                  // On success, authenticate the user and pass required details
                  authContext.authenticate(
                    res.data.user, // User data
                    res.data.accessToken, // Access token
                    res.data.user.is_blind, // Blind status // user dalna tha bas
                    res.data.user.is_disabled // Disabled status // user dalna tha bas
                  );
                  navigate("/"); // Redirect to home page after successful login
                })
                .catch((err) => {
                  // Handle errors
                  let error = err.message;
                  if (err?.response?.data) error = JSON.stringify(err.response.data);
                  setError(error);
                });
            }}
          >
            {({ errors, touched, getFieldProps, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <div className="input-container">
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    {...getFieldProps("email")}
                  />
                  <div className="form-error-text">
                    {touched.email && errors.email ? errors.email : null}
                  </div>
                </div>

                <div className="input-container">
                  <input
                    id="password"
                    type="password"
                    placeholder="Password"
                    {...getFieldProps("password")}
                  />
                  <div className="form-error-text">
                    {touched.password && errors.password ? errors.password : null}
                  </div>
                </div>

                <button className="login-button button-primary" type="submit">
                  Login
                </button>
              </form>
            )}
          </Formik>

          <div className="form-info-text">Forgot Password?</div>

          <hr />

          <button
            onClick={() => navigate("/signup")}
            className="button-secondary"
          >
            Create a New Account
          </button>
        </div>
      </LoginLayout>
    </div>
  );
};

export default Login;
