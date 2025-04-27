import React from "react";
import axios from "../../axios";


interface ChartProps {
  votes: Record<string, number>;
  enableVote?: boolean;
  userId?: number;
  userName?: string;
  onVote?: (candidate: string) => void; // Added onVote prop
}

const Chart = (props: ChartProps) => {
  const votes = props.votes;

  const getButtons = () => {
    const names = [];

    const handleVote = (candidate: string) => {
      if (props.enableVote && props.onVote) {
        props.onVote(candidate);
      }
    };

    for (const name in votes) {
      names.push(
        <button
          onClick={() => handleVote(name)}
          key={name}
          className="button-wrapper text-normal"
          disabled={!props.enableVote}
        >
          vote
        </button>
      );
    }

    return names;
  };

  // Rest of the component remains the same
  const getNames = () => {
    const names = [];
    for (const name in votes) {
      names.push(
        <div key={name} className="name-wrapper text-normal">
          {name}
        </div>
      );
    }
    return names;
  };

  const getTotal = () => {
    let total = 0;
    for (const name in votes) {
      total += parseInt(votes[name].toString());
    }
    return total;
  };

  const getBars = () => {
    const bars = [];
    const total = getTotal();
    for (const name in votes) {
      const count = votes[name];
      bars.push(
        <div key={name} className="bar-wrapper">
          <div
            style={{
              height: count !== 0 ? `${(count * 100) / total}%` : "auto",
              border: "2px solid #4daaa7",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "center",
              color: "white",
              backgroundColor: "rgb(77, 170, 167)",
              paddingBottom: 10,
              paddingTop: 10,
            }}
          >
            {votes[name]}
          </div>
        </div>
      );
    }
    return bars;
  };

  return (
    <div>
      <div className="bars-container">{getBars()}</div>
      <div className="names-wrapper">{getNames()}</div>
      {props.enableVote && (
        <div className="buttons-wrapper">{getButtons()}</div>
      )}
    </div>
  );
};

export default Chart;