import React, { useContext, useEffect, useState } from "react";
import axios from "../../axios";
import Chart from "../../components/Polls/Chart";
import Finished from "../../components/Polls/Finished";
import Panel from "../../components/Polls/Panel";
import Running from "../../components/Polls/Running";
import Waiting from "../../components/Waiting";
import { AuthContext } from "../../contexts/Auth";
const stringSimilarity = require("string-similarity");

// Text-to-speech function
const speakMessage = (text: string) => {
  return new Promise<void>((resolve, reject) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1; // Adjust speaking rate if needed
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);
      window.speechSynthesis.speak(utterance);
    } else {
      console.log("Text-to-speech not supported");
      resolve();
    }
  });
};

// Face Verification Loader Component
const FaceVerificationLoader: React.FC = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      backgroundColor: "#f8f9fa",
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        maxWidth: "400px",
        width: "90%",
      }}>
        <div style={{
          position: "relative",
          width: "80px",
          height: "80px",
          margin: "0 auto 24px",
        }}>
          {/* Face outline */}
          <div style={{
            position: "absolute",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "3px solid #3498db",
            top: "10px",
            left: "10px",
          }} />
          
          {/* Scanning animation */}
          <div style={{
            position: "absolute",
            width: "100%",
            height: "4px",
            backgroundColor: "rgba(52, 152, 219, 0.5)",
            top: "38px",
            left: "0",
            animation: "scan 1.5s infinite ease-in-out",
          }} />
          
          {/* Circular loader */}
          <div style={{
            position: "absolute",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#3498db",
            animation: "spin 1s infinite linear",
          }} />
        </div>
        
        <h3 style={{
          margin: "0 0 8px 0",
          color: "#333",
          fontWeight: 600,
          fontSize: "18px",
        }}>Face Verification</h3>
        
        <p style={{
          margin: "0",
          color: "#666",
          fontSize: "14px",
          lineHeight: "1.5",
        }}>Please wait while we securely verify your identity</p>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 10px; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 66px; opacity: 0; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner: React.FC = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
    }}>
      <div style={{
        width: "50px",
        height: "50px",
        border: "5px solid #f3f3f3",
        borderTop: "5px solid #3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
      }}></div>
      <p style={{ color: "#666" }}>Loading poll data...</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const User = () => {
  const [voteState, setVoteStatus] = useState<"finished" | "running" | "not-started" | "checking">("checking");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ 
    name: string; 
    description: string; 
    votes: Record<string, number>; 
  }>({ name: "", description: "", votes: {} });
  
  const [votable, setVotable] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);

  const authContext = useContext(AuthContext);

  // Face verification + Load poll data after verification
  useEffect(() => {
    if (!faceVerified) {
      speakMessage("Verifying face. Please wait.").then(() => {
        axios.post("http://localhost:5000/start-face-recognition", { userId: authContext.id })
          .then((res) => {
            if (res.data.verified) {
              console.log("✅ Face verified successfully!");
              speakMessage("Face verified.");
              setFaceVerified(true);
              fetchPollData();
            } else {
              console.error("❌ Face verification failed!");
              speakMessage("Face verification failed. Please try again.");
              alert("Face verification failed. Please try again.");
            }
          })
          .catch((err) => {
            console.error("❌ Error in face verification:", err);
            speakMessage("Error during face verification. Please try again.");
          });
      });
    }
  }, [authContext.id, faceVerified]);

  // Fetch poll data function
  const fetchPollData = () => {
    console.log("📊 Fetching poll data...");

    axios.get("/polls/")
      .then((res) => {
        setData(res.data);
        setLoading(false);
        console.log("📜 Available candidates:", Object.keys(res.data.votes));
      })
      .catch((err) => console.error("❌ Error fetching poll data:", err));

    axios.get("/polls/status")
      .then((res) => setVoteStatus(res.data.status))
      .catch((error) => console.error("❌ Error fetching poll status:", error));

    axios.post("/polls/check-voteability", { id: authContext.id.toString() })
      .then((res) => setVotable(res.data))
      .catch((err) => console.error("❌ Error checking voteability:", err));
  };

  // Start Voice Voting or Hand Gesture Voting
  useEffect(() => {
    if (faceVerified && voteState === "running" && votable === "not-voted" && Object.keys(data.votes).length > 0) {
      if (authContext.is_blind) {
        startVoiceVoting();
      }
      if (authContext.is_disabled) {
        startHandGestureVoting();
      }
    }
  }, [faceVerified, voteState, votable, authContext.is_blind, authContext.is_disabled, data]);

  // Hand Gesture Detection for Disabled Users
  const startHandGestureVoting = async () => {
    try {
      console.log("🦽 Starting hand gesture voting...");

      const candidates = Object.keys(data.votes);
      if (candidates.length > 0) {
        let instructionMessage = "Hand detection started. ";
        candidates.forEach((candidate, index) => {
          instructionMessage += `To vote for ${candidate}, show ${index + 1}. `;
        });

        await speakMessage(instructionMessage);
      }

      // Open gesture detection window
      const detectionWindow = window.open("http://localhost:5000/", "_blank");

      // Listen for messages from gesture detection window
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== "http://localhost:5000") return;

        if (event.data.type === 'GESTURE_RESULT' && event.data.number) {
          const gestureNumber = event.data.number;
          const candidates = Object.keys(data.votes);
          const candidateIndex = gestureNumber - 1;

          console.log("Received gesture number:", gestureNumber);

          if (candidates[candidateIndex]) {
            const selectedCandidate = candidates[candidateIndex];
            console.log(`🗳️ Voting for ${selectedCandidate}`);
            vote(selectedCandidate);
          } else {
            alert(`Invalid gesture. Only ${candidates.length} candidates available.`);
          }

          // Cleanup
          window.removeEventListener('message', messageListener);
          detectionWindow?.close();
        }
      };

      window.addEventListener('message', messageListener);
    } catch (err) {
      console.error("❌ Hand gesture detection error:", err);
    }
  };

  // Voice Voting Logic
  const startVoiceVoting = async () => {
    try {
      console.log("🎙️ Starting voice voting...");
      const candidates = Object.keys(data.votes);
      
      // Speak candidate list
      if (candidates.length > 0) {
        const candidateList = candidates.join(" or ");
        await speakMessage(`Whom do you want to vote for? ${candidateList}`);
      }

      const response = await axios.get("http://localhost:5000/start-recording");
      const spokenCandidate = response.data.text.trim().toLowerCase();
      const candidateNames = Object.keys(data.votes).map(name => name.trim().toLowerCase());

      const bestMatch = stringSimilarity.findBestMatch(spokenCandidate, candidateNames);

      if (bestMatch.bestMatch.rating > 0.6) {
        const matchedCandidate = bestMatch.bestMatch.target;
        const actualCandidate = Object.keys(data.votes).find(
          name => name.trim().toLowerCase() === matchedCandidate
        );

        if (actualCandidate) {
          console.log(`✅ User voted for: ${actualCandidate}`);
          await speakMessage(`You voted for ${actualCandidate}. Thank you.`);
          vote(actualCandidate);
        } else {
          console.error("⚠️ Candidate name mismatch! Retrying...");
          await speakMessage("Could not recognize the candidate name. Please try again.");
          startVoiceVoting();
        }
      } else {
        console.error("⚠️ No match found for the candidate.");
        await speakMessage("No match found for the candidate. Please try again.");
      }
    } catch (err) {
      console.error("❌ Error during voice voting:", err);
      speakMessage("Error during voting process. Please try again.");
    }
  };

  // Vote function
  const vote = (candidate: string) => {
    console.log("🗳️ Starting voting process for:", candidate);
  
    // First submit the vote
    axios.post("/polls/vote", {
      id: authContext.id.toString(),
      name: authContext.name,
      candidate,
    })
    .then((voteRes) => {
      console.log("✅ Vote casted successfully!", voteRes.data);
      
      // Update UI state first
      setVotable("voted");
      setVoteStatus("finished");
      setData(prevData => ({
        ...prevData,
        votes: {
          ...prevData.votes,
          [candidate]: (prevData.votes[candidate] || 0) + 1,
        },
      }));

      // Then send certificate email
      return axios.post("http://localhost:5000/mail", {
        id: authContext.id.toString(),
      });
    })
    .then(async (emailRes) => {
      console.log("📧 Certificate email sent successfully", emailRes.data);
      await speakMessage("Your vote has been recorded. Thank you!");
    })
    .catch(async (err) => {
      console.error("❌ Error in voting process:", err.response?.data || err);
      await speakMessage("Failed to complete the voting process. Please try again.");
    });
  };

  // Replace the simple div with our professional loader
  if (!faceVerified) return <FaceVerificationLoader />;
  if (loading || voteState === "checking") return <LoadingSpinner />;
  if (voteState === "not-started") return <Waiting />;

  return (
    <Panel name={data.name} description={data.description}>
      <>
        {voteState === "running" ? <Running /> : <Finished />}
        <Chart
          enableVote={votable === "not-voted"}
          userId={authContext.id}
          userName={authContext.name}
          votes={data.votes}
          onVote={vote}
        />
      </>
    </Panel>
  );
};

export default User;