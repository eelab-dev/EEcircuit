import React, { useState, useEffect, useRef } from "react";
import type { ResultType } from "./sim/readOutput";

type Props = {
  results: ResultType;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function Box({ results, onChange }: Props): JSX.Element {
  const list = results.variables.splice(1);

  return (
    <div>
      {list.map((e, i) => (
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
