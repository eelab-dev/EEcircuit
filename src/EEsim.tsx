import React, { useState, useEffect, useRef } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";

import Plot from "./plot";
import Box from "./box";
import type { ResultType, VariableType } from "./sim/readOutput";

let sim: Simulation;

export type DisplayDataType = {
  name: string;
  index: number;
  checked: boolean;
};

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<ResultType>({
    param: {
      varNum: 0,
      pointNum: 0,
      variables: [{ name: "", type: "time", visible: false }] as VariableType[],
    },
    header: "",
    data: [],
  });
  const [netList, setNetList] = React.useState(circuits.bsimTrans);

  useEffect(() => {
    sim = new Simulation();
    console.log(sim);

    sim.start();
  }, []);

  useEffect(() => {
    sim.setOutputEvent(() => {
      console.log("🚀", sim.getResults());
      setResults(sim.getResults());
      //displayData = makeDD(sim.getResults());

      console.log("🥳", results);
    });
  }, [results]);

  const makeDD = (res: ResultType): DisplayDataType[] => {
    const dd = [] as DisplayDataType[];
    res.param.variables.forEach((e, i) => {
      dd.push({ name: e.name, index: i, checked: true });
    });
    return dd;
  };

  const btClick = () => {
    if (sim) {
      sim.setNetList(netList);
      sim.runSim();
      setOpen(true);
    } else {
      //
    }
  };

  const change = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(event.target.name);
      console.log("change->", results);
      //index 0 is time
      const res = { ...results };
      console.log("change->", res);
      res.param.variables[index].visible = event.target.checked;

      setResults(res);
    },
    [results]
  );

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
      <div style={{ display: "flex", width: "100%" }}>
        <textarea
          style={{
            width: "60%",
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
        <div style={{ width: "30%", marginLeft: "5%" }}>
          <Box results={results} onChange={change} />
        </div>
      </div>
      <button style={btStyle} onClick={btClick}>
        Plot 📈
      </button>
      <div>
        <Plot results={results} />
      </div>
    </div>
  );
}
