import { Button } from "@chakra-ui/react";
import React from "react";
import type { ComplexDataType, RealDataType } from "./sim/readOutput";
import { isComplex, ResultArrayType } from "./sim/simulationArray";

type Prop = {
  resultArray?: ResultArrayType;
};

const DownCSV = ({ resultArray }: Prop): JSX.Element => {
  const aLink = React.useRef<HTMLAnchorElement>(null);
  const [href, setHref] = React.useState("");
  //
  const printCSVReal = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";

    const vars = resultArray.results[0].param.variables;
    vars.forEach((e) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0 ? `[${resultArray.sweep[i]}]` : "";
        strTop = `${strTop}${e.name} ${sweepIndex},`;
      }
    });
    strTop = strTop + "\n";

    for (let row = 0; row < resultArray.results[0].data[0].length; row++) {
      for (let col = 0; col < resultArray.results[0].data.length; col++) {
        for (let i = 0; i < resultArray.results.length; i++) {
          const data = resultArray.results[i].data as RealDataType;
          const a = data[col][row];
          //time-series are unequal length
          const s = a !== undefined ? a.toExponential() : "NaN";
          str = `${str}${s},`;
        }
      }
      str = str + "\n";
    }
    return strTop + str;
  };

  const printCSVComplex = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";

    //const data = resultArray.data  as ComplexDataType;
    const vars = resultArray.results[0].param.variables;
    vars.forEach((e) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0 ? `[${resultArray.sweep[i]}]` : "";
        strTop = `${strTop}${e.name} ${sweepIndex} (real),${e.name} ${sweepIndex} (img),`;
      }
    });
    strTop = strTop + "\n";

    for (let row = 0; row < resultArray.results[0].data[0].length; row++) {
      for (let col = 0; col < resultArray.results[0].data.length; col++) {
        //console.log(out2[col][row]);
        for (let i = 0; i < resultArray.results.length; i++) {
          const data = resultArray.results[i].data as ComplexDataType;
          str = `${str}${data[col][row].real.toExponential()},${data[col][
            row
          ].img.toExponential()},`;
        }
      }
      str = str + "\n";
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
  }, [resultArray]);

  React.useEffect(() => {
    if (href.length > 0) {
      aLink.current?.click();
    }
  }, [href]);

  const btAction = () => {
    setHref(`data:text/plain;charset=utf-8,${encodeURIComponent(printCSV(resultArray))}`);
  };

  return (
    <>
      <Button type="submit" colorScheme="blue" onClick={btAction}>
        Download
      </Button>
      <a ref={aLink} href={href} download={"EEsim.csv"} />
    </>
  );
};

export default React.memo(DownCSV);
