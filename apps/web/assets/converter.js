const VALID_DIRECTIONS = new Set(["TB", "TD", "BT", "RL", "LR"]);

export function convertWorkflow(workflow, { direction = "LR" } = {}) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Desteklenmeyen yön: ${direction}`);
  }
  if (!Array.isArray(workflow?.nodes)) {
    throw new Error("Geçersiz n8n workflow: 'nodes' bir liste olmalı.");
  }
  if (!workflow.nodes.every(isObject)) {
    throw new Error("Geçersiz n8n workflow: her node bir nesne olmalı.");
  }
  if (!isObject(workflow.connections ?? {})) {
    throw new Error("Geçersiz n8n workflow: 'connections' bir nesne olmalı.");
  }

  const sourceNodes = workflow.nodes.filter((node) => !isStickyNote(node));
  const nodes = sourceNodes.map((node, index) => ({
    id: `n${index + 1}`,
    name: node.name == null ? `Unnamed node ${index + 1}` : String(node.name),
    type: String(node.type ?? ""),
    disabled: Boolean(node.disabled),
  }));
  const identifiers = new Map(nodes.map((node) => [node.name, node.id]));
  if (identifiers.size !== nodes.length) {
    throw new Error("Geçersiz n8n workflow: node adları benzersiz olmalı.");
  }

  const lines = [`flowchart ${direction}`];
  const title = typeof workflow.name === "string" ? workflow.name.trim() : "";
  if (title) lines.push(`    %% ${title}`);

  for (const node of nodes) {
    lines.push(`    ${node.id}["${escapeLabel(nodeLabel(node.name, node.type))}"]`);
  }

  const emitted = new Set();
  for (const [sourceName, connectionTypes] of Object.entries(workflow.connections ?? {})) {
    const sourceId = identifiers.get(sourceName);
    if (!sourceId || !isObject(connectionTypes)) continue;
    for (const [kind, outputs] of Object.entries(connectionTypes)) {
      if (!Array.isArray(outputs)) continue;
      outputs.forEach((targets, outputIndex) => {
        if (!Array.isArray(targets)) return;
        for (const target of targets) {
          if (!isObject(target)) continue;
          const targetId = identifiers.get(String(target.node ?? ""));
          if (!targetId) continue;
          const key = `${sourceId}\u0000${targetId}\u0000${kind}\u0000${outputIndex}`;
          if (emitted.has(key)) continue;
          emitted.add(key);
          const label = edgeLabel(kind, outputIndex);
          lines.push(`    ${sourceId}${label ? ` -->|${label}| ` : " --> "}${targetId}`);
        }
      });
    }
  }

  const triggerIds = nodes.filter((node) => node.type.endsWith("Trigger")).map((node) => node.id);
  const disabledIds = nodes.filter((node) => node.disabled).map((node) => node.id);
  if (triggerIds.length) {
    lines.push(`    class ${triggerIds.join(",")} trigger`);
    lines.push("    classDef trigger fill:#dbeafe,stroke:#2563eb,color:#172554");
  }
  if (disabledIds.length) {
    lines.push(`    class ${disabledIds.join(",")} disabled`);
    lines.push(
      "    classDef disabled fill:#f3f4f6,stroke:#9ca3af,color:#6b7280,stroke-dasharray: 5 5",
    );
  }
  return `${lines.join("\n")}\n`;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStickyNote(node) {
  return String(node.type ?? "").endsWith(".stickyNote");
}

function nodeLabel(name, nodeType) {
  const shortType = nodeType.split(".").at(-1);
  return shortType ? `${name}\\n${shortType}` : name;
}

function edgeLabel(kind, outputIndex) {
  return kind === "main" ? (outputIndex === 0 ? "" : `output ${outputIndex + 1}`) : kind;
}

function escapeLabel(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}
