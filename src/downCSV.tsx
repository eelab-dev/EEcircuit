import React, { useState, useEffect, useRef } from "react";

type Prop = {
  dataIn: number[][];
};

export default function DownCSV({ dataIn }: Prop): JSX.Element {
  function printCSV(data: number[][]): string {
    let str = "";

    data = data.length == 0 ? [[0], [1]] : data;

    for (let row = 0; row < data[0].length; row++) {
      for (let col = 0; col < data.length; col++) {
        //console.log(out2[col][row]);
        str = str + data[col][row].toExponential(3) + ",";
      }
      str = str + "\n";
    }
    return str;
  }
  return (
    <>
      <a
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(printCSV(dataIn))}`}
        download={"eesim.csv"}>
        Download
      </a>
    </>
  );
}
