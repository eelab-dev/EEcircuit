import { Button } from "./components/ui/button.tsx";
import { Checkbox } from "./components/ui/checkbox.tsx";
import React, { JSX } from "react";
import { isComplex, ResultArrayType } from "./sim/simulationArray.ts";
import { ComplexNumber } from "eecircuit-engine";
import { CheckboxCheckedChangeDetails } from "@chakra-ui/react/checkbox";
import { VStack } from "@chakra-ui/react";

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

  const convertToMagPhase = (input: ComplexNumber): ComplexPolar => {
    const magnitude = Math.sqrt(input.real ** 2 + input.img ** 2);
    const phase = Math.atan2(input.img, input.real) * (180 / Math.PI); // Convert radians to degrees

    return { magnitude, phase };
  };

  const printCSVComplex = (resultArray: ResultArrayType): string => {
    console.log(resultArray);
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

  React.useEffect(() => {
    setHref("");
    if (resultArray) {
      setComplex(
        isComplex(resultArray ? resultArray : { results: [], sweep: [] }),
      );
    }
  }, [resultArray, complex]);

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
    const e = details.checked === true ? true : false;
    setPolar(e);
  };

  return (
    <>
      <VStack gap={5} align="flex-start" ml={4}>
        {complex && (
          <Checkbox defaultChecked={true} onCheckedChange={ckAction}>
            Convert to magnitude and phase
          </Checkbox>
        )}
        <Button type="submit" colorScheme="blue" onClick={btAction}>
          Download
        </Button>
      </VStack>

      <a ref={aLink} href={href} download={"EEsim.csv"} />
    </>
  );
};

export default React.memo(DownCSV);
