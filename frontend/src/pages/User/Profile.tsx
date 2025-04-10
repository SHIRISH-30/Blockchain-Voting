import React, { useContext, useEffect, useState } from "react";
import { RouteProps } from "react-router";
import { AuthContext } from "../../contexts/Auth";

interface UserDetails {
  id: number;
  name: string;
  citizenshipNumber: string;
  email: string;
  admin: number;
  verified: number;
  is_blind: number;
  is_disabled: number;
}

const Profile = (props: RouteProps) => {
  const authContext = useContext(AuthContext);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await fetch("http://localhost:5000/details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: authContext.id,
            name: authContext.name,
          }),
        });

        const data = await res.json();
        if (data.user_details) {
          setUserDetails(data.user_details);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [authContext.id, authContext.name]);

  return (
    <div className="profile-wrapper">
      <div className="left-panel">
        <div className="person-icon">
          <i className="bi bi-person-circle"></i>
        </div>
        <div className="text-normal username">{authContext.name}</div>
        <button onClick={authContext.logout} className="button-primary">
          Logout
        </button>
      </div>

      <div className="right-panel">
        <span className="title-small">Profile</span>

        {loading ? (
          <>
            <div className="skeleton"></div>
            <div className="skeleton"></div>
            <div className="skeleton"></div>
            <div className="skeleton"></div>
          </>
        ) : userDetails ? (
          <div className="details">
            <p><strong>ID:</strong> {userDetails.id}</p>
            <p><strong>Name:</strong> {userDetails.name}</p>
            <p><strong>Email:</strong> {userDetails.email}</p>
            <p><strong>Citizenship No:</strong> {userDetails.citizenshipNumber}</p>
            <p><strong>Admin:</strong> {userDetails.admin ? "Yes" : "No"}</p>
            <p><strong>Verified:</strong> {userDetails.verified ? "Yes" : "No"}</p>
            <p><strong>Blind:</strong> {userDetails.is_blind ? "Yes" : "No"}</p>
            <p><strong>Disabled:</strong> {userDetails.is_disabled ? "Yes" : "No"}</p>
          </div>
        ) : (
          <p className="text-danger">Failed to load user details.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
