import React, { useState, useEffect, useRef } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";

import Plot from "./plot";
import Box from "./box";
import type { ResultType, VariableType } from "./sim/readOutput";

let sim: Simulation;

export type DisplayDataType = {
  name: string;
  index: number; //result index
  visible: boolean;
};

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<ResultType>({
    param: {
      varNum: 0,
      pointNum: 0,
      variables: [{ name: "", type: "time" }] as VariableType[],
    },
    header: "",
    data: [],
  });
  const [netList, setNetList] = React.useState(circuits.bsimTrans);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>([
    { name: "", index: 0, visible: false },
  ]);

  useEffect(() => {
    sim = new Simulation();
    console.log(sim);

    sim.start();
  }, []);

  useEffect(() => {
    sim.setOutputEvent(() => {
      console.log("🚀", sim.getResults());
      setResults(sim.getResults());
      const dd = makeDD(sim.getResults());
      setDisplayData(dd);
    });
  }, [results]);

  const makeDD = (res: ResultType): DisplayDataType[] => {
    const dd = [] as DisplayDataType[];
    res.param.variables.forEach((e, i) => {
      if (i > 0) {
        dd.push({ name: e.name, index: i, visible: true });
      }
    });
    console.log("makeDD->", dd);
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
      const name = event.target.name;

      //index 0 is time

      const dd = displayData;

      dd.forEach((e) => {
        if (e.name == name) {
          e.visible = event.target.checked;
          console.log("change->", e, name);
        }
      });
      //console.log("change->", dd);

      setDisplayData([...dd]);
    },
    [displayData]
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
          <Box displayData={displayData} onChange={change} />
        </div>
      </div>
      <button style={btStyle} onClick={btClick}>
        Plot 📈
      </button>
      <div>
        <Plot results={results} displayData={displayData} />
      </div>
    </div>
  );
}
