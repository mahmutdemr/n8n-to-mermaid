import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.esm.min.mjs";

import { convertWorkflow } from "./converter.js";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  flowchart: { htmlLabels: false, useMaxWidth: true },
});

const textarea = document.querySelector("#workflow-json");
const fileInput = document.querySelector("#workflow-file");
const dropZone = document.querySelector("#drop-zone");
const direction = document.querySelector("#direction");
const convertButton = document.querySelector("#convert-button");
const clearButton = document.querySelector("#clear-button");
const downloadButton = document.querySelector("#download-button");
const editButton = document.querySelector("#edit-button");
const status = document.querySelector("#input-status");
const diagram = document.querySelector("#diagram");
const sourceDetails = document.querySelector("#source-details");
const mermaidSource = document.querySelector("#mermaid-source");
const inputStep = document.querySelector("#input-step");
const resultStep = document.querySelector("#result-step");
const sourceStepLabel = document.querySelector("#source-step-label");
const resultStepLabel = document.querySelector("#result-step-label");

let generatedMermaid = "";
let outputName = "workflow.mmd";

convertButton.addEventListener("click", renderWorkflow);
clearButton.addEventListener("click", clearWorkspace);
downloadButton.addEventListener("click", downloadMermaid);
editButton.addEventListener("click", showInputStep);
direction.addEventListener("change", renderWorkflow);
fileInput.addEventListener("change", () => loadFile(fileInput.files?.[0]));
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});
dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files?.[0]));

async function loadFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
    setStatus("Lütfen bir .json workflow dosyası seçin.", true);
    return;
  }
  try {
    textarea.value = await file.text();
    outputName = `${file.name.replace(/\.json$/i, "") || "workflow"}.mmd`;
    setStatus(`${file.name} yüklendi.`);
  } catch {
    setStatus("Dosya okunamadı.", true);
  }
}

async function renderWorkflow() {
  const source = textarea.value.trim();
  if (!source) {
    setStatus("Önce n8n workflow JSON’unu yapıştırın veya bir dosya yükleyin.", true);
    return;
  }
  try {
    const workflow = JSON.parse(source);
    generatedMermaid = convertWorkflow(workflow, { direction: direction.value });
    outputName = outputName === "workflow.mmd" ? fileNameFor(workflow) : outputName;
    const renderId = `workflow-${Date.now()}`;
    const { svg } = await mermaid.render(renderId, generatedMermaid);
    diagram.innerHTML = svg;
    sourceDetails.hidden = false;
    mermaidSource.textContent = generatedMermaid;
    downloadButton.disabled = false;
    setStatus("Diyagram hazır.");
    showResultStep();
  } catch (error) {
    generatedMermaid = "";
    downloadButton.disabled = true;
    diagram.replaceChildren();
    sourceDetails.hidden = true;
    setStatus(error instanceof Error ? error.message : "Diyagram oluşturulamadı.", true);
  }
}

function clearWorkspace() {
  textarea.value = "";
  fileInput.value = "";
  generatedMermaid = "";
  outputName = "workflow.mmd";
  diagram.replaceChildren();
  sourceDetails.hidden = true;
  downloadButton.disabled = true;
  setStatus("");
  textarea.focus();
}

function showResultStep() {
  inputStep.hidden = true;
  resultStep.hidden = false;
  sourceStepLabel.classList.remove("is-active");
  resultStepLabel.classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showInputStep() {
  resultStep.hidden = true;
  inputStep.hidden = false;
  resultStepLabel.classList.remove("is-active");
  sourceStepLabel.classList.add("is-active");
  textarea.focus();
}

function downloadMermaid() {
  if (!generatedMermaid) return;
  const blob = new Blob([generatedMermaid], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = outputName;
  link.click();
  URL.revokeObjectURL(url);
}

function fileNameFor(workflow) {
  const base = typeof workflow.name === "string" && workflow.name.trim() ? workflow.name : "workflow";
  return `${base.replaceAll(/[^a-z0-9-_]+/gi, "-").replaceAll(/^-|-$/g, "") || "workflow"}.mmd`;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}
