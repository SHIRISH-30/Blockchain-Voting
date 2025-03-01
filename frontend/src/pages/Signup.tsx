import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Formik } from "formik";
import LoginLayout from "../layouts/Login";
import * as Yup from "yup";
import axios from "../axios"; // Your custom axios instance
import Webcam from "react-webcam";
import { AxiosError } from "axios"; // Import AxiosError for type checking

// Validation schema
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

// Image compression utility
const compressImage = async (base64Str: string, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if compression fails
  });
};

const Signup = (): JSX.Element => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [imageSource, setImageSource] = useState<"camera" | "upload">("camera");

  // Capture photo from webcam
  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setCameraError("");
    } else {
      setCameraError("Failed to capture photo. Please try again.");
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setImage(null);
    setCameraError("");
  };

  // Handle file upload
  const handleFileUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
        setCameraError("");
      }
    };
    reader.readAsDataURL(file);
  };

  // Stop webcam when component unmounts or source changes
  useEffect(() => {
    return () => {
      if (webcamRef.current) {
        const stream = webcamRef.current.stream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, [imageSource]);

  // Submit handler
  const handleSubmit = async (
    values: {
      name: string;
      email: string;
      citizenshipNumber: string;
      password: string;
      confirm: string;
      is_blind: boolean;
      is_disabled: boolean;
    },
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    if (!image) {
      setError("Please capture or upload a photo");
      setSubmitting(false);
      return;
    }

    try {
      const compressedImage = await compressImage(image);

      await axios.post("/auth/signup", {
        ...values,
        image: compressedImage,
      });

      setError("");
      setSuccess("Signup Successful!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      let errorMessage = "An error occurred";

      // Type-safe error handling
      if ((err as AxiosError).isAxiosError) {
        const axiosError = err as AxiosError<{ message?: string }>;
        errorMessage = axiosError.response?.data?.message || axiosError.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage.slice(0, 100));
    } finally {
      setSubmitting(false);
    }
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
            onSubmit={handleSubmit}
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
                {/* Name Field */}
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

                {/* Citizenship Number Field */}
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

                {/* Email Field */}
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

                {/* Password Field */}
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

                {/* Confirm Password Field */}
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

                {/* Image Source Toggle */}
                <div className="image-source-toggle">
                  <label>
                    <input
                      type="radio"
                      value="camera"
                      checked={imageSource === "camera"}
                      onChange={(e) => {
                        setImageSource("camera");
                        setImage(null);
                      }}
                    />
                    Live Camera Capture
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="upload"
                      checked={imageSource === "upload"}
                      onChange={(e) => {
                        setImageSource("upload");
                        setImage(null);
                      }}
                    />
                    Upload Photo
                  </label>
                </div>

                {/* Camera Section */}
                {imageSource === "camera" ? (
                  <div className="camera-section">
                    {!image ? (
                      <>
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="webcam-view"
                          videoConstraints={{ facingMode: "user" }}
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
                  </div>
                ) : (
                  <div className="upload-section">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                    />
                    {image && (
                      <>
                        <img src={image} alt="Uploaded" className="preview-image" />
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setImage(null)}
                        >
                          Remove Photo
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Camera Error */}
                {cameraError && (
                  <div className="form-error-text">{cameraError}</div>
                )}

                {/* Checkbox Group */}
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

                {/* Submit Button */}
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

          {/* Login Link */}
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