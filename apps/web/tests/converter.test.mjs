import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { convertWorkflow } from "../assets/converter.js";

const input = new URL("../../../examples/input/simple-workflow.json", import.meta.url);
const output = new URL("../../../examples/output/simple-workflow.mmd", import.meta.url);

test("browser converter matches the canonical example output", async () => {
  const workflow = JSON.parse(await readFile(input, "utf8"));
  const expected = await readFile(output, "utf8");

  assert.equal(convertWorkflow(workflow), expected);
});

test("browser converter supports flowchart direction", async () => {
  const workflow = JSON.parse(await readFile(input, "utf8"));

  assert.match(convertWorkflow(workflow), /^flowchart LR/m);
});

test("browser converter omits sticky notes", () => {
  const workflow = {
    nodes: [
      { name: "Başlangıç", type: "n8n-nodes-base.manualTrigger" },
      { name: "Not", type: "n8n-nodes-base.stickyNote" },
      { name: "Bitiş", type: "n8n-nodes-base.set" },
    ],
    connections: {
      Başlangıç: { main: [[{ node: "Bitiş" }]] },
      Not: { main: [[{ node: "Bitiş" }]] },
    },
  };

  const result = convertWorkflow(workflow);

  assert.doesNotMatch(result, /Not/);
  assert.match(result, /n1 --> n2/);
});
