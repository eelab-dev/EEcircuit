/**
 *
 * @param netList
 */

/**
 * test case for regex: https://regexr.com/
 * .dc vds 0 1.8 .01 Vg 0 1.8 0.1 10n 0.1n 1m 1k 1z 2p 0.1P 0.1p 11 11m -2 -3 -3.1   -1.02nm 0.001  10.001  -10.124   -651.01m
 */

export type ParserType = {
  dc: boolean;
  sweep: boolean;
  sweepStart: number;
  sweepEnd: number;
  sweepStep: number;
};

const getParser = (netList: string): ParserType => {
  const parseResults = {
    dc: false,
    sweep: false,
    sweepStart: 0,
    sweepEnd: 0,
    sweepStep: 0,
  } as ParserType;

  const dcLine = netList.match(/^(.dc.*)/m);

  if (dcLine) {
    parseResults.dc = true;
    const dcLineDigits = (dcLine[0] + " ").match(/-?\d*\.?\d+?[\sGMkmunp]/g);
    console.log("parser->dcsweep", dcLineDigits);
    if (dcLineDigits && dcLineDigits.length == 6) {
      parseResults.sweep = true;
      parseResults.sweepStart = parseFloat(dcLineDigits[3]);
      parseResults.sweepEnd = parseFloat(dcLineDigits[4]);
      parseResults.sweepStep = parseFloat(dcLineDigits[5]);
    }
  }

  console.log("parser->", parseResults);

  return parseResults;
};

export default getParser;
