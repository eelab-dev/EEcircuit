import React, { useState, useEffect, useRef } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";
import TextField from "@material-ui/core/TextField";
import {
  Button,
  createMuiTheme,
  Snackbar,
  SnackbarCloseReason,
  ThemeProvider,
} from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import Plot from "./plot";

let sim: Simulation;

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState([[]] as number[][]);
  const [netList, setNetList] = React.useState(circuits.bsimTrans);

  const darkTheme = createMuiTheme({
    palette: {
      type: "dark",
    },
  });

  useEffect(() => {
    sim = new Simulation();
    console.log(sim);
    sim.setOutputEvent(() => {
      setData(sim.getResults().data);
      console.log(data);
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

  const handleClose = (event: React.SyntheticEvent, reason: SnackbarCloseReason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ width: "60%" }}>
        <TextField
          id="filled-multiline-static"
          label="Netlist"
          multiline
          rows={15}
          value={netList}
          onChange={(e) => {
            setNetList(e.target.value);
          }}
          variant="filled"
          fullWidth={true}
          spellCheck={false}
        />

        <Button variant="contained" color="primary" onClick={btClick}>
          Run
        </Button>
      </div>
      <div>
        <Plot data={data} />

        <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
          <Alert severity="success">This is a success message!</Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}
