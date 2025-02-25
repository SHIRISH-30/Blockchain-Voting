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
    console.log("🗳️ Casting vote for:", candidate);
    axios.post("/polls/vote", {
      id: authContext.id.toString(),
      name: authContext.name,
      candidate,
    })
    .then(async (res) => {
      console.log("✅ Vote casted successfully!", res.data);
      await speakMessage(`Your vote for ${candidate} has been recorded. Thank you.`);
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
    .catch(async (err) => {
      console.error("❌ Error voting:", err.response?.data || err);
      // await speakMessage("Error submitting your vote. Please try again.");
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