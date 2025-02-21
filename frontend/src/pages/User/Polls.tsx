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
    votes: Record<string, number>; // ✅ Fix: Properly typed votes
  }>({ name: "", description: "", votes: {} });
  
  const [votable, setVotable] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);

  const authContext = useContext(AuthContext);

  //  Face verification + Load poll data after verification
  useEffect(() => {
    if (!faceVerified) {
      axios.post("http://localhost:5000/start-face-recognition", { userId: authContext.id })
        .then((res) => {
          if (res.data.verified) {
            console.log("✅ Face verified successfully!");
            setFaceVerified(true);

            //  Fetch poll data after successful face verification
            fetchPollData();
          } else {
            console.error("❌ Face verification failed!");
            alert("Face verification failed. Please try again.");
          }
        })
        .catch((err) => console.error("❌ Error in face verification:", err));
    }
  }, [authContext.id, faceVerified]);

  //  Fetch poll data function (called after face verification)
  const fetchPollData = () => {
    console.log("📊 Fetching poll data...");

    axios.get("/polls/")
      .then((res) => {
        setData(res.data);
        setLoading(false);
        console.log("📜 Available candidates:", Object.keys(res.data.votes)); // Debugging log
      })
      .catch((err) => console.error("❌ Error fetching poll data:", err));

    axios.get("/polls/status")
      .then((res) => setVoteStatus(res.data.status))
      .catch((error) => console.error("❌ Error fetching poll status:", error));

    axios.post("/polls/check-voteability", { id: authContext.id.toString() })
      .then((res) => setVotable(res.data))
      .catch((err) => console.error("❌ Error checking voteability:", err));
  };

  //  Start Voice Voting only after data is fully loaded
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

  const detectDisabledPerson = async () => {
    try {
      console.log("🦽 Detecting disabled person...");
      const response = await axios.get("http://localhost:5000/detect");
      console.log("✅ Disabled person detected:", response.data);
    } catch (err) {
      console.error("❌ Error detecting disabled person:", err);
    }
  };

  const startVoiceVoting = async () => {
    try {
      console.log("🎙️ Starting voice voting...");

      // Ensure candidate list is populated thaki mujhe candidates mile//
      if (Object.keys(data.votes).length === 0) {
        console.error("⚠️ No candidates available for voting!");
        alert("No candidates available for voting. Please try again later.");
        return;
      }

      const response = await axios.get("http://localhost:5000/start-recording");
      const spokenCandidate = response.data.text.trim().toLowerCase();
      const candidateNames = Object.keys(data.votes).map(name => name.trim().toLowerCase());

      console.log("🎧 Recognized speech:", spokenCandidate);
      console.log("📜 Available candidates:", candidateNames);

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

  //  Vote function dekhte  (Without Reload)
  const vote = (candidate: string) => {
    console.log("🗳️ Casting vote for:", candidate); 

    axios.post("/polls/vote", {
      id: authContext.id.toString(),
      name: authContext.name,
      candidate,  // Ensure correct candidate name is passed
    })
    .then((res) => {
      console.log("✅ Vote casted successfully!", res.data);

      //  Updates UI instead of reloading //haha i am genius
      setVotable("voted");
      setVoteStatus("finished");

      //  Update vote count dynamically // hope it works
      setData(prevData => ({
        ...prevData,
        votes: {
          ...prevData.votes,
          [candidate]: (prevData.votes[candidate] || 0) + 1 // ✅ No TypeScript error now //gpt logic
        }
      }));
    })
    .catch((err) => {
      console.error("❌ Error voting:", err.response?.data || err);
      alert("Error while voting. Please try again.");
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
