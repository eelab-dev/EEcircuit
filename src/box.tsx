import React, { useState, useEffect, useRef } from "react";
import type { ResultType } from "./sim/readOutput";

type Props = {
  results: ResultType;
};

export default function Box({ results }: Props): JSX.Element {
  const list = results.variables.splice(1);

  return (
    <>
      {list.map((e, i) => (
        <div key={i}>
          <input type="checkbox"></input>
          <label> {e.name}</label>
        </div>
      ))}
    </>
  );
}
