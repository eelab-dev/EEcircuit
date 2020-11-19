import React, { useState, useEffect, useRef } from "react";
import type { DisplayDataType } from "./EEsim";

type Props = {
  displayData: DisplayDataType[];
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function Box({ displayData, onChange }: Props): JSX.Element {
  //const list = results.param.variables;
  const list = displayData;

  /*if (list.length == results.param.varNum) {
    list.shift();
  }*/

  const boxStyle = {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    backgroundColor: "rgb(30,30,30)",
    padding: "1em",
  } as React.CSSProperties;

  return (
    <div style={boxStyle}>
      {list.map((e, i) => (
        <div key={e.index}>
          <input
            type="checkbox"
            name={e.name}
            key={e.index}
            onChange={onChange}
            defaultChecked={true}></input>
          <label> {e.name}</label>
        </div>
      ))}
    </div>
  );
}

export default React.memo(Box);
//don't use memo and see why it returns empty?
