import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Formik } from "formik";
import { RouteProps } from "react-router";
import LoginLayout from "../layouts/Login";
import * as Yup from "yup";
import axios from "axios";
import { AuthContext } from "../contexts/Auth";

const schema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(3).required("Required"),
});

const Login = (props: RouteProps): JSX.Element => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [error, setError] = useState<string>("");
  const [isCheckingRFID, setIsCheckingRFID] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Inactivity Timer Ref
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogin = useCallback(async (values: { email: string; password: string }) => {
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
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    }
  }, [authContext, navigate]);

  const checkRFIDCredentials = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/rfid-credentials');
      if (response.data) {
        await handleLogin({
          email: response.data.email,
          password: response.data.password
        });
        setIsCheckingRFID(false);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Ignore 404 errors
      }
    }
  }, [handleLogin]);

  useEffect(() => {
    if (isCheckingRFID) {
      intervalRef.current = setInterval(checkRFIDCredentials, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCheckingRFID, checkRFIDCredentials]);

  const startRFIDCheck = () => {
    setIsCheckingRFID(true);
  };

  // Face Login Function (unchanged)
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
      setError(err instanceof Error ? err.message : "Face login failed");
    }
  };

  // ✅ Inactivity Detection for Face Login (2 min)
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        handleFaceLogin();
      }, 1 * 60 * 1000); // 2 minutes
    };

    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("mousedown", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);

    resetInactivityTimer(); // Initialize on mount

    return () => {
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      window.removeEventListener("mousedown", resetInactivityTimer);
      window.removeEventListener("touchstart", resetInactivityTimer);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      <LoginLayout error={error}>
        <div className="form-container">
          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={schema}
            onSubmit={handleLogin}
          >
            {({ errors, touched, getFieldProps, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <div className="input-container">
                  <input id="email" type="email" placeholder="Email" {...getFieldProps("email")} />
                  <div className="form-error-text">
                    {touched.email && errors.email ? errors.email : null}
                  </div>
                </div>

                <div className="input-container">
                  <input id="password" type="password" placeholder="Password" {...getFieldProps("password")} />
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

          <button onClick={handleFaceLogin} className="button-secondary">
            Face Login
          </button>
          <button 
            onClick={startRFIDCheck} 
            disabled={isCheckingRFID}
            className="button-secondary"
          >
            {isCheckingRFID ? "Checking RFID..." : "RFID Login"}
          </button>
          <button onClick={() => navigate("/signup")} className="button-secondary">
            Create a New Account
          </button>
        </div>
      </LoginLayout>
    </div>
  );
};

export default Login;
