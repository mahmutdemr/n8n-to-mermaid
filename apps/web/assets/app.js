import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.esm.min.mjs";

import { convertWorkflow } from "./converter.js";

const textarea = document.querySelector("#workflow-json");
const fileInput = document.querySelector("#workflow-file");
const dropZone = document.querySelector("#drop-zone");
const direction = document.querySelector("#direction");
const theme = document.querySelector("#theme");
const convertButton = document.querySelector("#convert-button");
const clearButton = document.querySelector("#clear-button");
const exampleButton = document.querySelector("#example-button");
const settingsButton = document.querySelector("#settings-button");
const settingsPanel = document.querySelector("#settings-panel");
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
const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

applyTheme(readThemePreference());

convertButton.addEventListener("click", renderWorkflow);
clearButton.addEventListener("click", clearWorkspace);
exampleButton.addEventListener("click", loadExample);
settingsButton.addEventListener("click", toggleSettings);
downloadButton.addEventListener("click", downloadMermaid);
editButton.addEventListener("click", showInputStep);
direction.addEventListener("change", () => {
  closeSettings();
  renderWorkflow();
});
theme.addEventListener("change", () => {
  writeThemePreference(theme.value);
  applyTheme(theme.value);
  void renderGeneratedDiagram();
});
colorScheme.addEventListener("change", () => {
  if (theme.value !== "system") return;
  initializeMermaid();
  void renderGeneratedDiagram();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSettings();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".settings-wrap")) closeSettings();
});
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
    setStatus("Please choose an n8n workflow .json file.", true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setStatus("This file is over the 10 MB limit. Choose a smaller workflow.", true);
    return;
  }
  try {
    textarea.value = await file.text();
    outputName = `${file.name.replace(/\.json$/i, "") || "workflow"}.mmd`;
    setStatus(`${file.name} loaded.`);
  } catch {
    setStatus("The file could not be read.", true);
  }
}

async function renderWorkflow() {
  const source = textarea.value.trim();
  if (!source) {
    setStatus("Paste your n8n workflow JSON or upload a file first.", true);
    return;
  }
  try {
    setConvertLoading(true);
    const workflow = JSON.parse(source);
    generatedMermaid = convertWorkflow(workflow, { direction: direction.value });
    outputName = outputName === "workflow.mmd" ? fileNameFor(workflow) : outputName;
    await renderGeneratedDiagram();
    sourceDetails.hidden = false;
    mermaidSource.textContent = generatedMermaid;
    downloadButton.disabled = false;
    setStatus("Diagram ready.");
    showResultStep();
  } catch (error) {
    generatedMermaid = "";
    downloadButton.disabled = true;
    diagram.replaceChildren();
    sourceDetails.hidden = true;
    setStatus(error instanceof Error ? error.message : "The diagram could not be created.", true);
  } finally {
    setConvertLoading(false);
  }
}

async function renderGeneratedDiagram() {
  if (!generatedMermaid) return;
  const renderId = `workflow-${Date.now()}`;
  const { svg } = await mermaid.render(renderId, generatedMermaid);
  diagram.innerHTML = svg;
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

function loadExample() {
  textarea.value = JSON.stringify(
    {
      name: "New customer welcome",
      nodes: [
        { name: "Form submitted", type: "n8n-nodes-base.formTrigger" },
        { name: "Create contact", type: "n8n-nodes-base.hubspot" },
        { name: "Welcome email", type: "n8n-nodes-base.gmail" },
      ],
      connections: {
        "Form submitted": { main: [[{ node: "Create contact" }]] },
        "Create contact": { main: [[{ node: "Welcome email" }]] },
      },
    },
    null,
    2,
  );
  outputName = "new-customer-welcome.mmd";
  setStatus("Example workflow added. You can create the diagram now.");
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

function setConvertLoading(isLoading) {
  convertButton.disabled = isLoading;
  convertButton.innerHTML = isLoading
    ? "Creating diagram…"
    : 'Create diagram <span aria-hidden="true">→</span>';
}

function toggleSettings() {
  const isOpen = !settingsPanel.hidden;
  settingsPanel.hidden = isOpen;
  settingsButton.setAttribute("aria-expanded", String(!isOpen));
}

function closeSettings() {
  if (settingsPanel.hidden) return;
  settingsPanel.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

function readThemePreference() {
  try {
    const savedTheme = localStorage.getItem("n8n-to-mermaid-theme");
    return ["system", "light", "dark"].includes(savedTheme) ? savedTheme : "system";
  } catch {
    return "system";
  }
}

function writeThemePreference(value) {
  try {
    localStorage.setItem("n8n-to-mermaid-theme", value);
  } catch {
    // Theme selection still works when storage is unavailable.
  }
}

function applyTheme(preference) {
  theme.value = preference;
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
  initializeMermaid();
}

function initializeMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: effectiveTheme() === "dark" ? "dark" : "neutral",
    flowchart: { htmlLabels: false, useMaxWidth: true },
  });
}

function effectiveTheme() {
  return theme.value === "system" ? (colorScheme.matches ? "dark" : "light") : theme.value;
}
