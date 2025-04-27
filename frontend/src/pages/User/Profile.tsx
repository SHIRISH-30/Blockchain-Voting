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

  const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    } else if (names[0].length > 1) {
      initials += names[0].substring(1, 2).toUpperCase();
    }
    
    return initials;
  };

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

  const SkeletonLoader = () => (
    <div style={{ width: "100%" }}>
      {[...Array(4)].map((_, index) => (
        <div 
          key={index}
          style={{
            height: "24px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
            marginBottom: "16px",
            width: `${Math.floor(Math.random() * 30) + 70}%`,
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );

  const AttributeBadge = ({ active, label }: { active: boolean; label: string }) => (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: active ? "#e3f2fd" : "#f5f5f5",
      color: active ? "#1976d2" : "#9e9e9e",
      padding: "4px 12px",
      borderRadius: "16px",
      fontSize: "14px",
      fontWeight: 500,
      margin: "0 8px 8px 0",
    }}>
      <span style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: active ? "#1976d2" : "#bdbdbd",
        marginRight: "6px",
      }}></span>
      {label}
    </div>
  );

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "40px 20px",
      gap: "30px",
      minHeight: "80vh",
    }}>
      {/* Left Panel - User Info Card */}
      <div style={{
        flex: "0 0 280px",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        padding: "30px",
        height: "fit-content",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          backgroundColor: "#e8f0fe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "#1976d2",
          fontSize: "42px",
          fontWeight: 600,
          textTransform: "uppercase",
        }}>
          {getInitials(authContext.name)}
        </div>
        
        <h2 style={{
          margin: "10px 0",
          fontSize: "22px",
          fontWeight: 600,
          textAlign: "center",
        }}>
          {authContext.name}
        </h2>
        
        {userDetails && (
          <div style={{
            fontSize: "14px",
            color: "#666",
            marginBottom: "20px",
            textAlign: "center",
          }}>
            ID: {userDetails.id}
          </div>
        )}
        
        <div style={{
          borderTop: "1px solid #eee",
          width: "100%",
          margin: "15px 0",
        }}></div>
        
        <button 
          onClick={authContext.logout}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.2s",
            width: "100%",
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#d32f2f"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f44336"}
        >
          <i className="bi bi-box-arrow-right"></i>
          Logout
        </button>
      </div>

      {/* Right Panel - Details */}
      <div style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        padding: "30px",
      }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          marginBottom: "30px",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <i className="bi bi-person-badge" style={{ color: "#1976d2" }}></i>
          User Profile
        </h1>

        {loading ? (
          <SkeletonLoader />
        ) : userDetails ? (
          <>
            {/* Status badges */}
            <div style={{ marginBottom: "24px" }}>
              <AttributeBadge active={Boolean(userDetails.admin)} label="Admin" />
              <AttributeBadge active={Boolean(userDetails.verified)} label="Verified" />
              <AttributeBadge active={Boolean(userDetails.is_blind)} label="Visual Assistance" />
              <AttributeBadge active={Boolean(userDetails.is_disabled)} label="Physical Assistance" />
            </div>
            
            {/* User Information */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}>
              <InfoItem label="Full Name" value={userDetails.name} icon="bi-person" />
              <InfoItem label="Email Address" value={userDetails.email} icon="bi-envelope" />
              <InfoItem label="Citizenship Number" value={userDetails.citizenshipNumber} icon="bi-card-heading" />
              <InfoItem label="User ID" value={userDetails.id.toString()} icon="bi-hash" />
            </div>
            
            {/* Security Section */}
            <div style={{
              marginTop: "30px",
              backgroundColor: "#fafafa",
              borderRadius: "8px",
              padding: "20px 24px",
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#333",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <i className="bi bi-shield-lock" style={{ color: "#1976d2" }}></i>
                Security Information
              </h3>
              <p style={{
                fontSize: "14px",
                color: "#666",
                lineHeight: "1.5",
                marginBottom: "8px",
              }}>
                • Your account is using biometric verification for secure authentication
              </p>
              <p style={{
                fontSize: "14px",
                color: "#666",
                lineHeight: "1.5",
              }}>
                • All vote transactions are securely recorded on the blockchain
              </p>
            </div>
          </>
        ) : (
          <div style={{
            padding: "20px",
            backgroundColor: "#ffebee",
            borderRadius: "8px",
            color: "#c62828",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <i className="bi bi-exclamation-triangle"></i>
            Failed to load user details. Please try again later.
          </div>
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div style={{
    backgroundColor: "#f9f9f9",
    padding: "16px 20px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
  }}>
    <span style={{
      fontSize: "13px",
      color: "#666",
      marginBottom: "6px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }}>
      <i className={`bi ${icon}`}></i>
      {label}
    </span>
    <span style={{
      fontSize: "16px",
      fontWeight: 500,
      color: "#333",
    }}>
      {value}
    </span>
  </div>
);

export default Profile;