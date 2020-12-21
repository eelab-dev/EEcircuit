import React, { useEffect } from "react";
import Simulation from "./sim/simulation";
import * as circuits from "./sim/circuits";

import EditorCustom from "./editor/editorCustom";

import Plot from "./plot";
import DisplayBox from "./box";
import type { ResultType, VariableType } from "./sim/readOutput";
import DownCSV from "./downCSV";

import {
  Box,
  ChakraProvider,
  Divider,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
} from "@chakra-ui/react";
import { Button, ButtonGroup } from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";

let sim: Simulation;
const store = window.localStorage;

export type DisplayDataType = {
  name: string;
  index: number; //result index
  visible: boolean;
};

export default function EEsim(): JSX.Element {
  // Create the count state.

  const [isSimLoaded, setIsSimLoaded] = React.useState(false);
  /*const [results, setResults] = React.useState<ResultType>({
    param: {
      varNum: 0,
      pointNum: 0,
      variables: [{ name: "", type: "time" }] as VariableType[],
    },
    header: "",
    data: [],
  });*/
  const [results, setResults] = React.useState<ResultType>();
  const [netList, setNetList] = React.useState(circuits.bsimTrans);
  const [displayData, setDisplayData] = React.useState<DisplayDataType[]>();
  const [tabIndex, setTabIndex] = React.useState(0);

  useEffect(() => {
    const loadedNetList = store.getItem("netList");
    setNetList(loadedNetList ? loadedNetList : circuits.bsimTrans);

    const loadedDisplayDataString = store.getItem("displayData");
    if (loadedDisplayDataString) {
      const loadedDisplayData = JSON.parse(loadedDisplayDataString) as DisplayDataType[];
      setDisplayData(loadedDisplayData);
    }
  }, []);

  useEffect(() => {
    if (isSimLoaded) {
      sim.setOutputEvent(() => {
        console.log("🚀", sim.getResults());
        setResults(sim.getResults());
        //const dd = makeDD(sim.getResults());
        //setDisplayData(dd);
      });
    }
  }, [isSimLoaded, results]);

  //DisplayData logic
  useEffect(() => {
    if (results) {
      const newDD = makeDD(results);
      let tempDD = [] as DisplayDataType[];
      newDD.forEach((newData, i) => {
        let match = false;
        let visible = true;
        if (displayData) {
          displayData.forEach((oldData) => {
            if (newData.name == oldData.name) {
              match = true;
              visible = oldData.visible;
            }
          });
          if (match) {
            tempDD.push({ name: newData.name, index: newData.index, visible: visible });
          } else {
            tempDD.push({ name: newData.name, index: newData.index, visible: true });
          }
        } else {
          tempDD.push({ name: newData.name, index: newData.index, visible: true });
        }
      });
      console.log("makeDD->", tempDD);
      setDisplayData([...tempDD]);
    }

    //??????????????????????????????????????????????????doesn't change when changing circiut
  }, [results]);

  const makeDD = (res: ResultType): DisplayDataType[] => {
    let dd = [] as DisplayDataType[];
    res.param.variables.forEach((e, i) => {
      if (i > 0) {
        dd.push({ name: e.name, index: i, visible: true });
      }
    });
    console.log("makeDD->", dd);
    return dd;
  };

  const btRun = () => {
    //const monacoValue = (monacoValueGetter.current() as unknown) as string;
    //console.log("Monaco 🎨:", monacoValue);

    //setNetList(monacoValue);
    store.setItem("netList", netList);
    if (sim) {
      sim.setNetList(netList);
      sim.runSim();
    } else {
      sim = new Simulation();
      console.log(sim);
      sim.start();
      console.log("🧨🧨🧨🧨🧨🧨🧨🧨");
      btRun();
      setIsSimLoaded(true);
    }
  };

  const change = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;

      //index 0 is time

      if (isSimLoaded && displayData) {
        const dd = displayData;

        dd.forEach((e) => {
          if (e.name == name) {
            e.visible = event.target.checked;
            console.log("change->", e, name);
          }
        });
        //console.log("change->", dd);

        setDisplayData([...dd]);
        const stringDD = JSON.stringify(dd);
        store.setItem("displayData", stringDD);
      }
    },
    [displayData, isSimLoaded]
  );

  const config = {
    useSystemColorMode: false,
    initialColorMode: "dark",
  };

  const customTheme = extendTheme({ config });

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleEditor = (value: string | undefined) => {
    value ? setNetList(value) : {};
  };

  return (
    <ChakraProvider theme={customTheme}>
      <div>
        <Box p={2}>
          <div style={{ display: "flex", width: "100%" }}>
            <EditorCustom
              height="30vh"
              width="100%"
              language="spice"
              value={netList}
              valueChanged={handleEditor}
              theme="vs-dark"
            />

            <div style={{ width: "30%", marginLeft: "5%" }}>
              <DisplayBox displayData={displayData ? displayData : []} onChange={change} />
            </div>
          </div>
        </Box>

        <Box p={2}>
          <Button colorScheme="blue" variant="solid" size="lg" onClick={btRun}>
            Run 🚀
          </Button>
        </Box>
        <Box p={2}>
          <Divider />
        </Box>

        <Tabs variant="soft-rounded" colorScheme="teal">
          <TabList>
            <Tab>Plot 📈</Tab>
            <Tab>Info 🧙‍♂️</Tab>
            <Tab>CSV 🧾</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Plot results={results} displayData={displayData} />
            </TabPanel>

            <TabPanel>
              <Textarea
                readOnly={true}
                aria-label="info"
                bg="gray.900"
                fontSize="0.9em"
                rows={15}
                value={results ? results.header : ""}
              />
            </TabPanel>

            <TabPanel>
              <DownCSV results={results} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </ChakraProvider>
  );
}
