import React, { useState, useContext } from "react";
import { useNavigate } from "react-router";
import { Formik } from "formik";
import { RouteProps } from "react-router";
import LoginLayout from "../layouts/Login";
import * as Yup from "yup";
import axios from "axios";
import { AuthContext } from "../contexts/Auth";

// Validation schema for Formik
const schema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(3).required("Required"),
});

const Login = (props: RouteProps): JSX.Element => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [error, setError] = useState<string>("");

  // Face Login Function
  const handleFaceLogin = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;

      await new Promise((resolve) => (video.onloadedmetadata = resolve));
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      const imageData = canvas.toDataURL("image/jpeg");

      const response = await axios.post("http://localhost:5000/face-login", { image: imageData });

      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      authContext.authenticate(
        response.data.user,
        response.data.accessToken,
        response.data.user.is_blind,
        response.data.user.is_disabled
      );
      navigate("/");
    } catch (err) {
      let errorMessage = "Face login failed";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  return (
    <div>
      <LoginLayout error={error}>
        <div className="form-container">
          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={schema}
            onSubmit={async (values) => {
              try {
                const res = await axios.post("http://localhost:8000/auth/login", values);

                localStorage.setItem("accessToken", res.data.accessToken);
                localStorage.setItem("user", JSON.stringify(res.data.user));

                authContext.authenticate(
                  res.data.user,
                  res.data.accessToken,
                  res.data.user.is_blind,
                  res.data.user.is_disabled
                );
                navigate("/");
              } catch (err) {
                let errorMessage = "Login failed";
                if (err instanceof Error) {
                  errorMessage = err.message;
                }
                setError(errorMessage);
              }
            }}
          >
            {({ errors, touched, getFieldProps, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <div className="input-container">
                  <input id="email" type="email" placeholder="Email" {...getFieldProps("email")} />
                  <div className="form-error-text">{touched.email && errors.email ? errors.email : null}</div>
                </div>

                <div className="input-container">
                  <input id="password" type="password" placeholder="Password" {...getFieldProps("password")} />
                  <div className="form-error-text">{touched.password && errors.password ? errors.password : null}</div>
                </div>

                <button className="login-button button-primary" type="submit">Login</button>
              </form>
            )}
          </Formik>

          <div className="form-info-text">Forgot Password?</div>

          <hr />

          <button onClick={handleFaceLogin} className="button-secondary">Face Login</button>
          <button onClick={() => navigate("/signup")} className="button-secondary">Create a New Account</button>
        </div>
      </LoginLayout>
    </div>
  );
};

export default Login;
