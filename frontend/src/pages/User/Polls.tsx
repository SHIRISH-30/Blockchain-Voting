import React, { useContext, useEffect, useState } from "react";
import axios from "../../axios";
import Chart from "../../components/Polls/Chart";
import Finished from "../../components/Polls/Finished";
import Panel from "../../components/Polls/Panel";
import Running from "../../components/Polls/Running";
import Waiting from "../../components/Waiting";
import { AuthContext } from "../../contexts/Auth";
const stringSimilarity = require("string-similarity");

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
      axios.post("http://localhost:5000/start-face-recognition", { userId: authContext.id })
        .then((res) => {
          if (res.data.verified) {
            console.log("✅ Face verified successfully!");
            setFaceVerified(true);
            fetchPollData();
          } else {
            console.error("❌ Face verification failed!");
            alert("Face verification failed. Please try again.");
          }
        })
        .catch((err) => console.error("❌ Error in face verification:", err));
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
        detectDisabledPerson();
      }
    }
  }, [faceVerified, voteState, votable, authContext.is_blind, authContext.is_disabled, data]);

  // Hand Gesture Detection for Disabled Users
  const detectDisabledPerson = async () => {
    try {
      console.log("🦽 Starting hand gesture detection...");
      
      // Open gesture detection window
      const detectionWindow = window.open("http://localhost:5000/", "_blank");
      
      // Listen for messages from gesture detection window
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== "http://localhost:5000") return;
  
        // Handle gesture detection result
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

  // Voice Voting Logic (unchanged)
  const startVoiceVoting = async () => {
    try {
      console.log("🎙️ Starting voice voting...");
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
          vote(actualCandidate);
        } else {
          console.error("⚠️ Candidate name mismatch! Retrying...");
          alert("Could not recognize the candidate name. Please try again.");
          startVoiceVoting();
        }
      } else {
        console.error("⚠️ No match found for the candidate.");
        alert("No match found for the candidate. Please try again.");
      }
    } catch (err) {
      console.error("❌ Error during voice voting:", err);
    }
  };

  // Vote function (unchanged)
  const vote = (candidate: string) => {
    console.log("🗳️ Casting vote for:", candidate); 
    axios.post("/polls/vote", {
      id: authContext.id.toString(),
      name: authContext.name,
      candidate,
    })
    .then((res) => {
      console.log("✅ Vote casted successfully!", res.data);
      setVotable("voted");
      setVoteStatus("finished");
      setData(prevData => ({
        ...prevData,
        votes: {
          ...prevData.votes,
          [candidate]: (prevData.votes[candidate] || 0) + 1
        }
      }));
    })
    .catch((err) => {
      console.error("❌ Error voting:", err.response?.data || err);
      
    });
  };

  if (!faceVerified) return <div>Verifying face...</div>;
  if (loading || voteState === "checking") return <div>Loading...</div>;
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
        />
      </>
    </Panel>
  );
};

export default User;