import { Button } from "./components/ui/button.tsx";
import { Checkbox } from "./components/ui/checkbox.tsx";
import React, { JSX, useMemo } from "react";
import { isComplex, ResultArrayType } from "./sim/simulationArray.ts";
import { ComplexNumber } from "eecircuit-engine";
import { CheckboxCheckedChangeDetails } from "@chakra-ui/react/checkbox";
import { VStack, Box, Table } from "@chakra-ui/react";

type Prop = {
  resultArray?: ResultArrayType;
};

type ComplexPolar = {
  magnitude: number;
  phase: number;
};

const DownCSV = ({ resultArray }: Prop): JSX.Element => {
  const aLink = React.useRef<HTMLAnchorElement>(null);
  const [href, setHref] = React.useState("");
  const [complex, setComplex] = React.useState(false);
  const [polar, setPolar] = React.useState(false);

  const convertToMagPhase = (input: ComplexNumber): ComplexPolar => {
    const magnitude = Math.sqrt(input.real ** 2 + input.img ** 2);
    const phase = Math.atan2(input.img, input.real) * (180 / Math.PI);
    return { magnitude, phase };
  };

  const printCSVReal = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";
    const vars = resultArray.results[0].variableNames;

    vars.forEach((name) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > i
          ? `[${resultArray.sweep[i]}]`
          : "";
        strTop += `${name} ${sweepIndex},`;
      }
    });
    strTop += "\n";

    const maxRows = resultArray.results.reduce((max, result) => {
      return Math.max(max, result.data[0].values.length);
    }, 0);

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < vars.length; col++) {
        for (let sweep = 0; sweep < resultArray.results.length; sweep++) {
          const result = resultArray.results[sweep];
          if (
            row < result.data[col].values.length && result.dataType === "real"
          ) {
            str += result.data[col].values[row].toExponential() + ",";
          } else {
            str += ",";
          }
        }
      }
      str += "\n";
    }
    return strTop + str;
  };

  const printCSVComplex = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";
    const vars = resultArray.results[0].variableNames;
    vars.forEach((name) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0
          ? `[${resultArray.sweep[i]}]`
          : "";
        strTop += `${name} ${sweepIndex} (real),${name} ${sweepIndex} (img),`;
      }
    });
    strTop += "\n";

    const maxRows = resultArray.results.reduce((max, result) => {
      return Math.max(max, result.data[0].values.length);
    }, 0);

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < vars.length; col++) {
        for (let sweep = 0; sweep < resultArray.results.length; sweep++) {
          const result = resultArray.results[sweep];
          if (
            row < result.data[col].values.length &&
            result.dataType === "complex"
          ) {
            const complexNumber = result.data[col].values[row];
            if (polar) {
              const polarNumber = convertToMagPhase(complexNumber);
              str += polarNumber.magnitude.toExponential() + "," +
                polarNumber.phase.toExponential() + ",";
            } else {
              str += complexNumber.real.toExponential() + "," +
                complexNumber.img.toExponential() + ",";
            }
          } else {
            str += ",";
          }
        }
      }
      str += "\n";
    }
    return strTop + str;
  };

  const printCSV = (resultArray?: ResultArrayType): string => {
    if (resultArray) {
      if (isComplex(resultArray)) {
        return printCSVComplex(resultArray);
      } else {
        return printCSVReal(resultArray);
      }
    } else {
      return "";
    }
  };

  const csvData = useMemo(() => {
    if (!resultArray || resultArray.results.length === 0) return { header: [], rows: [] };
    
    const csvContent = isComplex(resultArray) ? printCSVComplex(resultArray) : printCSVReal(resultArray);
    const lines = csvContent.trim().split("\n");
    if (lines.length === 0) return { header: [], rows: [] };

    const header = lines[0].split(",").filter(h => h.trim() !== "");
    const rows = lines.slice(1, 101).map(line => line.split(",").filter(c => c.trim() !== ""));
    
    return { header, rows, totalLines: lines.length - 1 };
  }, [resultArray, polar]);

  React.useEffect(() => {
    setHref("");
    if (resultArray) {
      setComplex(isComplex(resultArray));
    }
  }, [resultArray]);

  React.useEffect(() => {
    if (href.length > 0) {
      aLink.current?.click();
    }
  }, [href]);

  const btAction = () => {
    setHref(
      `data:text/plain;charset=utf-8,${
        encodeURIComponent(printCSV(resultArray))
      }`,
    );
  };

  const ckAction = (details: CheckboxCheckedChangeDetails) => {
    setPolar(details.checked === true);
  };

  return (
    <>
      <VStack gap={5} align="flex-start" ml={4} width="100%">
        {complex && (
          <Checkbox defaultChecked={false} onCheckedChange={ckAction}>
            Convert to magnitude and phase
          </Checkbox>
        )}
        <Button type="submit" colorScheme="blue" onClick={btAction}>
          Download CSV
        </Button>
        
        {resultArray && resultArray.results.length > 0 && (
          <Box width="95%" mt={4}>
            <Box mb={2} fontWeight="bold" fontSize="sm">
              Preview (Showing first {csvData.rows.length} of {csvData.totalLines} lines):
            </Box>
            <Box 
              maxHeight="500px" 
              overflow="auto" 
              border="1px solid" 
              borderColor="border.muted"
              borderRadius="md"
            >
              <Table.Root size="sm" variant="striped" stickyHeader>
                <Table.Header>
                  <Table.Row bg="bg.muted">
                    {csvData.header.map((h, i) => (
                      <Table.ColumnHeader key={i} whiteSpace="nowrap">{h}</Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {csvData.rows.map((row, i) => (
                    <Table.Row key={i}>
                      {row.map((cell, j) => (
                        <Table.Cell key={j} fontFamily="monospace" fontSize="xs">
                          {cell}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
      </VStack>

      <a ref={aLink} href={href} download={"EEcircuit.csv"} style={{ display: "none" }} />
    </>
  );
};

export default React.memo(DownCSV);