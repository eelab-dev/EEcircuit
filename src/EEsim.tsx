import React, { useState, useEffect, useRef } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";

import Plot from "./plot";
import Box from "./box";
import type { ResultType } from "./sim/readOutput";

let sim: Simulation;

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<ResultType>({
    varNum: 0,
    pointNum: 0,
    variables: [],
    header: "",
    data: [],
  });
  const [netList, setNetList] = React.useState(circuits.bsimTrans);

  useEffect(() => {
    sim = new Simulation();
    console.log(sim);
    sim.setOutputEvent(() => {
      setResults(sim.getResults());
      console.log(sim.getResults().variables);
    });
    sim.start();
  }, []);

  const btClick = () => {
    if (sim) {
      sim.setNetList(netList);
      sim.runSim();
      setOpen(true);
    } else {
      //
    }
  };

  const btStyle = {
    borderRadius: "0.3em",
    border: "none",
    padding: "1em 2em",
    backgroundColor: "#0070f3",
    color: "white",
    cursor: "pointer",
  } as React.CSSProperties;

  return (
    <div>
      <div style={{ width: "60%" }}>
        <textarea
          style={{
            width: "100%",
            backgroundColor: "rgb(20,20,20)",
            color: "white",
            borderRadius: "0.5em",
          }}
          rows={15}
          value={netList}
          onChange={(e) => {
            setNetList(e.target.value);
          }}
          spellCheck={false}
        />

        <button style={btStyle} onClick={btClick}>
          Plot 📈
        </button>
      </div>
      <div>
        <Box results={results} />
        <Plot data={results.data} />
      </div>
    </div>
  );
}
