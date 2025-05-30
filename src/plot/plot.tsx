import React, { useEffect, useState } from "react";
import { ResultType } from "eecircuit-engine";
import { Box, Checkbox, CheckboxGroup, Fieldset, For } from "@chakra-ui/react";
import { LineInitData, WebglLineThick, WebglPlot } from "webgl-plot";

interface PlotProps {
  results: ResultType[];
}

const Plot: React.FC<PlotProps> = ({ results }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  // Initialize with all variables selected by default
  useEffect(() => {
    if (results.length > 0 && results[0].variableNames) {
      // Skip the first variable (usually time) and select all others by default
      setSelectedVariables(results[0].variableNames.slice(1));
    }
  }, [results]);

  useEffect(() => {
    if (!canvasRef.current || results.length === 0) return;
    const canvas = canvasRef.current;

    // Wait for the next frame to ensure the canvas is rendered and has dimensions
    const setupCanvas = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get the computed style dimensions
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 800; // fallback to 800px
      const height = rect.height || 500; // fallback to 500px

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;

      console.log(
        "clientWidth",
        canvas.clientWidth,
        "clientHeight",
        canvas.clientHeight
      );

      console.log("getBoundingClientRect width", width, "height", height);
      console.log("canvas width", canvas.width, "canvas height", canvas.height);

      const maxLines = results[0].numVariables;
      const numX = results[0].numPoints;
      console.log("maxLines", maxLines, "numX", numX);

      const wglp = new WebglPlot(canvas);

      // Only create lines for selected variables (excluding the X-axis variable at index 0)
      const selectedIndices = selectedVariables
        .map((varName) => results[0].variableNames.indexOf(varName))
        .filter((index) => index > 0); // Exclude index 0 (X-axis variable)

      if (selectedIndices.length === 0) {
        // If no variables selected, just clear the canvas
        wglp.update();
        return;
      }

      const plotLine = new WebglLineThick(wglp, selectedIndices.length);
      const array = new Float32Array(numX * 2);
      const arrays: LineInitData[] = [];

      selectedIndices.forEach((lineIndex) => {
        for (let i = 0; i < numX; i++) {
          array[i * 2] = results[0].data[0].values[i] as number;
          array[i * 2 + 1] = results[0].data[lineIndex].values[i] as number;
        }
        arrays.push({
          points: new Float32Array(array),
          scale: [1, 1],
          offset: [0, 0],
          color: [Math.random(), Math.random(), Math.random(), 1],
          thickness: 0.01,
        });
      });

      plotLine.initLines(arrays);
      plotLine.draw();
    };

    // Use requestAnimationFrame to ensure the canvas is properly rendered
    requestAnimationFrame(setupCanvas);
  }, [results, selectedVariables]);

  return (
    <Box width="800px" height="500px">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <Fieldset.Root>
        <CheckboxGroup
          value={selectedVariables}
          onValueChange={setSelectedVariables}
          name="variables"
        >
          <Fieldset.Legend fontSize="sm" mb="2">
            X-axis: {results[0].variableNames[0]} | Select Y-axis variables to
            plot
          </Fieldset.Legend>
          <Fieldset.Content>
            <For each={results[0].variableNames.slice(1)}>
              {(value) => (
                <Checkbox.Root key={value} value={value}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>{value}</Checkbox.Label>
                </Checkbox.Root>
              )}
            </For>
          </Fieldset.Content>
        </CheckboxGroup>
      </Fieldset.Root>
    </Box>
  );
};

export default Plot;
