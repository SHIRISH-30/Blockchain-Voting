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
  const [data, setData] = useState({ name: "", description: "", votes: {} });
  const [votable, setVotable] = useState("");

  const authContext = useContext(AuthContext);

  useEffect(() => {
    axios.get("/polls/status")
      .then((res) => {
        setVoteStatus(res.data.status);
        setLoading(false);
      })
      .catch((error) => console.error("❌ Error fetching poll status:", error));
  }, []);

  useEffect(() => {
    if (voteState !== "checking") {
      axios.get("/polls/")
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch((err) => console.error("❌ Error fetching poll data:", err));

      axios.post("/polls/check-voteability", { id: authContext.id.toString() })
        .then((res) => setVotable(res.data))
        .catch((err) => console.error("❌ Error checking voteability:", err));
    }
  }, [voteState]);

  useEffect(() => {
    if (authContext.is_blind && voteState === "running" && votable === "not-voted") {
      startVoiceVoting();
    }
  }, [authContext.is_blind, voteState, votable, data.votes]);

  const startVoiceVoting = async () => {
    try {
      console.log("🎙️ Starting voice voting...");
      const response = await axios.get("http://localhost:5000/start-recording");
      const spokenCandidate = response.data.text.trim().toLowerCase();
      const candidateNames = Object.keys(data.votes).map(name => name.trim().toLowerCase());

      console.log("🎧 Recognized speech:", spokenCandidate);
      console.log("📜 Available candidates:", candidateNames);

      // Use fuzzy matching to find the closest match
      const bestMatch = stringSimilarity.findBestMatch(spokenCandidate, candidateNames);

      if (bestMatch.bestMatch.rating > 0.6) {
        const matchedCandidate = bestMatch.bestMatch.target;
        
        // Find the exact case-sensitive match from the original candidates list
        const actualCandidate = Object.keys(data.votes).find(
          name => name.trim().toLowerCase() === matchedCandidate
        );

        if (actualCandidate) {
          console.log(`✅ User voted for: ${actualCandidate}`);
          vote(actualCandidate);
        } else {
          console.error("⚠️ Candidate name mismatch! Retrying...");
          alert("Could not recognize the candidate name. Please try again.");
          startVoiceVoting(); // Retry
        }
      } else {
        console.error("⚠️ Invalid candidate name detected. Asking user to try again...");
        alert("Could not recognize the candidate name. Please try again.");
        startVoiceVoting(); // Retry if recognition fails
      }
    } catch (err) {
      console.error("❌ Error in speech recognition:", err);
    }
  };

  const vote = (candidate: string) => {
    console.log("🗳️ Casting vote for:", candidate); // Debugging log

    axios.post("/polls/vote", {
      id: authContext.id.toString(),
      name: authContext.name,
      candidate,  // Ensure correct candidate name is passed
    })
    .then((res) => {
      console.log("✅ Vote casted successfully!", res.data);
      window.location.reload();
    })
    .catch((err) => {
      console.error("❌ Error voting:", err.response?.data || err);
      alert("Error while voting. Please try again.");
    });
  };

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
