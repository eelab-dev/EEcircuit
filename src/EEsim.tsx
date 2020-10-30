import React, { useState, useEffect } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";
import TextField from "@material-ui/core/TextField";
import { Button, createMuiTheme, ThemeProvider } from "@material-ui/core";

let sim: Simulation;

export default function EEsim(): JSX.Element {
  // Create the count state.
  const [msg, setMsg] = useState("");

  const darkTheme = createMuiTheme({
    palette: {
      type: "dark",
    },
  });

  const btClick = () => {
    sim = new Simulation();
    console.log(sim);
    sim.setOutputEvent(() => {
      const data = sim.getResults();
      console.log(data);
    });
    sim.setNetList(circuits.bsimTrans);
    sim.start();
    sim.runSim();
    setMsg("done👍");
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ width: "60%" }}>
        <p>{msg}</p>
        <TextField
          id="filled-multiline-static"
          label="Netlist"
          multiline
          rows={15}
          defaultValue={circuits.bsimTrans}
          variant="filled"
          fullWidth={true}
        />

        <Button variant="contained" color="primary" onClick={btClick}>
          Run
        </Button>
      </div>
    </ThemeProvider>
  );
}
