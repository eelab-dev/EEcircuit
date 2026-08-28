import { readdir, readFile } from "node:fs/promises";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const files = (await readdir(assetsDirectory)).filter((file) => file.endsWith(".js"));
const fileSet = new Set(files);
const graph = new Map(files.map((file) => [file, new Set()]));

const basicLanguagesDirectory = new URL(
  "../node_modules/monaco-editor/esm/vs/basic-languages/",
  import.meta.url,
);
const builtInLanguageNames = (await readdir(basicLanguagesDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const unusedLanguageWorkers = /^(?:css|html|json|ts)\.worker-.*\.js$/;
const editorWorkers = files.filter((file) => /^editor\.worker-.*\.js$/.test(file));
const unwantedMonacoAssets = files.filter(
  (file) =>
    unusedLanguageWorkers.test(file) ||
    builtInLanguageNames.some((language) => file.startsWith(`${language}-`)),
);

if (editorWorkers.length !== 1) {
  throw new Error(`Expected exactly one Monaco editor worker, found ${editorWorkers.length}.`);
}

if (unwantedMonacoAssets.length > 0) {
  throw new Error(
    `Unused Monaco language assets detected:\n${unwantedMonacoAssets
      .map((file) => `  - ${file}`)
      .join("\n")}`,
  );
}

for (const file of files) {
  const source = await readFile(new URL(file, assetsDirectory), "utf8");
  const staticImports = [
    ...source.matchAll(/\bfrom["']\.\/([^"']+\.js)["']/g),
    ...source.matchAll(/\bimport["']\.\/([^"']+\.js)["']/g),
  ];
  const dynamicImports = [
    ...source.matchAll(/\bimport\(["']\.\/([^"']+\.js)["']\)/g),
  ];

  for (const match of [...staticImports, ...dynamicImports]) {
    const dependency = match[1];
    if (!fileSet.has(dependency)) {
      throw new Error(`${file} imports missing production chunk ${dependency}`);
    }
  }

  for (const match of staticImports) {
    const dependency = match[1];
    graph.get(file).add(dependency);
  }
}

let nextIndex = 0;
const indices = new Map();
const lowLinks = new Map();
const stack = [];
const onStack = new Set();
const cycles = [];

const visit = (file) => {
  indices.set(file, nextIndex);
  lowLinks.set(file, nextIndex);
  nextIndex += 1;
  stack.push(file);
  onStack.add(file);

  for (const dependency of graph.get(file)) {
    if (!indices.has(dependency)) {
      visit(dependency);
      lowLinks.set(file, Math.min(lowLinks.get(file), lowLinks.get(dependency)));
    } else if (onStack.has(dependency)) {
      lowLinks.set(file, Math.min(lowLinks.get(file), indices.get(dependency)));
    }
  }

  if (lowLinks.get(file) !== indices.get(file)) return;

  const component = [];
  let member;
  do {
    member = stack.pop();
    onStack.delete(member);
    component.push(member);
  } while (member !== file);

  if (component.length > 1 || graph.get(file).has(file)) {
    cycles.push(component);
  }
};

for (const file of files) {
  if (!indices.has(file)) visit(file);
}

if (cycles.length > 0) {
  const details = cycles.map((cycle) => `  - ${cycle.join(" -> ")}`).join("\n");
  throw new Error(`Circular production chunk imports detected:\n${details}`);
}

console.log(`Production chunk graph is acyclic (${files.length} JavaScript assets checked).`);
