/**
 *
 */

export function parser(netList: string): string[] {
  let start = 0;
  let stop = 0;
  let step = 0;
  let lineIndex = -1;
  let netListOutput = [] as string[];

  const lines = netList.split(/\r?\n/);
  lines.forEach((line, index) => {
    const s = line.split("[");
    const isComment = line.trim()[0] == "*";

    if (s[1] && !isComment) {
      const cmd = s[1].split(":");
      if (cmd.length > 2 && cmd[2].includes("]")) {
        start = parseFloat(cmd[0].trim());
        step = parseFloat(cmd[1].trim());
        stop = parseFloat(cmd[2].trim());
        console.log("parser 🤔 ->", cmd);
        lineIndex = index;
      }
    }
  });
  console.log("parser 🤔 ->", start, step, stop, lineIndex);

  if (lineIndex >= 0) {
    for (let i = start; i < stop; i = i + step) {
      let tempNetList = "";
      lines.forEach((line, index) => {
        if (index == lineIndex) {
          const s = line.split("[");
          const ss = line.split("]");
          const a = s[0] + `${i}` + ss[1];

          tempNetList = tempNetList + a;
        } else {
          tempNetList = tempNetList + line + "\n";
        }
      });
      netListOutput.push(tempNetList);
    }
  } else {
    netListOutput = [netList];
  }

  console.log("parser 🤔 ->", netListOutput);
  return netListOutput;
}
