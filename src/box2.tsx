import React, { useState, useEffect, useRef } from "react";
import type { DisplayDataType } from "./EEsim";
import type { ResultType, VariableType } from "./sim/readOutput";

type Props = {
  displayData: DisplayDataType[];
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function Box({ displayData, onChange }: Props): JSX.Element {
  return (
    <div>
      {displayData.map((e, i) => (
        <div key={i}>
          <input
            type="checkbox"
            name={i.toString()}
            key={i}
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
