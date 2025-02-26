import React, { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Formik } from "formik";
import LoginLayout from "../layouts/Login";
import * as Yup from "yup";
import axios from "../axios";
import Webcam from "react-webcam";

const schema = Yup.object().shape({
  name: Yup.string().min(3).required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  citizenshipNumber: Yup.string().min(4).required("Citizenship number is required"),
  password: Yup.string().min(3).required("Password is required"),
  confirm: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  is_blind: Yup.boolean(),
  is_disabled: Yup.boolean(),
});

const Signup = (): JSX.Element => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setCameraError("");
    } else {
      setCameraError("Failed to capture photo. Please try again.");
    }
  };

  const retakePhoto = () => {
    setImage(null);
    setCameraError("");
  };

  return (
    <div>
      <LoginLayout error={error} success={success}>
        <div className="form-container">
          <Formik
            initialValues={{
              name: "",
              email: "",
              citizenshipNumber: "",
              password: "",
              confirm: "",
              is_blind: false,
              is_disabled: false,
            }}
            validationSchema={schema}
            onSubmit={(
              { name, email, citizenshipNumber, password, is_blind, is_disabled },
              { setSubmitting }
            ) => {
              if (!image) {
                setError("Please capture a photo");
                setSubmitting(false);
                return;
              }

              axios
                .post("/auth/signup", {
                  name,
                  email,
                  citizenshipNumber,
                  password,
                  is_blind,
                  is_disabled,
                  image,
                })
                .then((res) => {
                  setError("");
                  setSuccess("Signup Successful!");
                  setTimeout(() => navigate("/login"), 2000);
                })
                .catch((err) => {
                  let error: string = err.message;
                  if (err?.response?.data)
                    error = JSON.stringify(err.response.data);
                  setError(error.slice(0, 50));
                })
                .finally(() => setSubmitting(false));
            }}
          >
            {({
              errors,
              touched,
              getFieldProps,
              handleSubmit,
              values,
              setFieldValue,
              isSubmitting,
            }) => (
              <form onSubmit={handleSubmit}>
                <div className="input-container">
                  <input
                    id="name"
                    type="text"
                    placeholder="Name"
                    {...getFieldProps("name")}
                  />
                  <div className="form-error-text">
                    {touched.name && errors.name ? errors.name : null}
                  </div>
                </div>

                <div className="input-container">
                  <input
                    id="citizenshipNumber"
                    type="text"
                    placeholder="Citizenship Number"
                    {...getFieldProps("citizenshipNumber")}
                  />
                  <div className="form-error-text">
                    {touched.citizenshipNumber && errors.citizenshipNumber
                      ? errors.citizenshipNumber
                      : null}
                  </div>
                </div>

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
                    {touched.password && errors.password
                      ? errors.password
                      : null}
                  </div>
                </div>

                <div className="input-container">
                  <input
                    id="confirm"
                    type="password"
                    placeholder="Confirm Password"
                    {...getFieldProps("confirm")}
                  />
                  <div className="form-error-text">
                    {touched.confirm && errors.confirm ? errors.confirm : null}
                  </div>
                </div>

                <div className="camera-section">
                  {!image ? (
                    <>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="webcam-view"
                        videoConstraints={{
                          facingMode: "user",
                        }}
                        onUserMediaError={() => {
                          setCameraError("Camera access denied. Please allow camera access.");
                        }}
                      />
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={capturePhoto}
                      >
                        Capture Photo
                      </button>
                    </>
                  ) : (
                    <>
                      <img src={image} alt="Captured" className="preview-image" />
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={retakePhoto}
                      >
                        Retake Photo
                      </button>
                    </>
                  )}
                  {cameraError && (
                    <div className="form-error-text">{cameraError}</div>
                  )}
                </div>

                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={values.is_blind}
                      onChange={(e) => setFieldValue("is_blind", e.target.checked)}
                    />
                    I am blind or visually impaired
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={values.is_disabled}
                      onChange={(e) => setFieldValue("is_disabled", e.target.checked)}
                    />
                    I have physical disabilities
                  </label>
                </div>

                <button
                  className="button-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Create a New Account"}
                </button>
              </form>
            )}
          </Formik>

          <hr />
          <div className="form-info-text">Already have an account?</div>

          <button
            onClick={() => navigate("/login")}
            className="button-secondary"
            type="button"
          >
            Login
          </button>
        </div>
      </LoginLayout>
    </div>
  );
};

export default Signup;