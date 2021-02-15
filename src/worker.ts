//https://stackoverflow.com/questions/50402004/error-ts2554-expected-2-3-arguments-but-got-1
const ctx: Worker = self as any;

ctx.onmessage = function (e) {
  console.log("Message received from main script");
  let workerResult = "Result: " + e.data[0] * e.data[1];
  console.log("Posting message back to main script", workerResult);
  console.log(e);
  ctx.postMessage(workerResult);
};
