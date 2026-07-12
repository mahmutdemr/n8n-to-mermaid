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

test("browser converter groups an agent and its AI subnodes", () => {
  const workflow = {
    nodes: [
      { name: "Girdi", type: "n8n-nodes-base.manualTrigger" },
      { name: "Destek Asistanı", type: "@n8n/n8n-nodes-langchain.agent" },
      { name: "Chat Model", type: "@n8n/n8n-nodes-langchain.lmChatOpenAi" },
      { name: "Hafıza", type: "@n8n/n8n-nodes-langchain.memoryBufferWindow" },
      { name: "Yanıt", type: "n8n-nodes-base.set" },
    ],
    connections: {
      Girdi: { main: [[{ node: "Destek Asistanı" }]] },
      "Chat Model": { ai_languageModel: [[{ node: "Destek Asistanı" }]] },
      Hafıza: { ai_memory: [[{ node: "Destek Asistanı" }]] },
      "Destek Asistanı": { main: [[{ node: "Yanıt" }]] },
    },
  };

  const result = convertWorkflow(workflow);

  assert.match(result, /subgraph agent_group_1\["Agent: Destek Asistanı"\]/);
  assert.match(result, /n1 --> n2/);
  assert.match(result, /n2 --> n5/);
});

test("browser converter groups RAG retrieval and AI generation", () => {
  const workflow = {
    nodes: [
      {
        name: "Retriever",
        type: "@n8n/n8n-nodes-langchain.vectorStorePinecone",
        parameters: { mode: "load" },
      },
      { name: "Embeddings", type: "@n8n/n8n-nodes-langchain.embeddingsOpenAi" },
      { name: "Yanıtla", type: "@n8n/n8n-nodes-langchain.informationExtractor" },
      { name: "Chat Model", type: "@n8n/n8n-nodes-langchain.lmChatOpenAi" },
    ],
    connections: {
      Embeddings: { ai_embedding: [[{ node: "Retriever" }]] },
      "Chat Model": { ai_languageModel: [[{ node: "Yanıtla" }]] },
    },
  };

  const result = convertWorkflow(workflow);

  assert.match(result, /subgraph rag_group_1\["RAG retrieval: Retriever"\]/);
  assert.match(result, /subgraph generation_group_1\["AI generation: Yanıtla"\]/);
});
