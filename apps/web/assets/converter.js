const VALID_DIRECTIONS = new Set(["TB", "TD", "BT", "RL", "LR"]);

export function convertWorkflow(workflow, { direction = "LR" } = {}) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Unsupported flow direction: ${direction}`);
  }
  if (!Array.isArray(workflow?.nodes)) {
    throw new Error("Invalid n8n workflow: 'nodes' must be a list.");
  }
  if (!workflow.nodes.every(isObject)) {
    throw new Error("Invalid n8n workflow: every node must be an object.");
  }
  if (!isObject(workflow.connections ?? {})) {
    throw new Error("Invalid n8n workflow: 'connections' must be an object.");
  }

  const sourceNodes = workflow.nodes.filter((node) => !isStickyNote(node));
  const nodes = sourceNodes.map((node, index) => ({
    id: `n${index + 1}`,
    name: node.name == null ? `Unnamed node ${index + 1}` : String(node.name),
    type: String(node.type ?? ""),
    disabled: Boolean(node.disabled),
    mode: typeof node.parameters?.mode === "string" ? node.parameters.mode : null,
  }));
  const identifiers = new Map(nodes.map((node) => [node.name, node.id]));
  if (identifiers.size !== nodes.length) {
    throw new Error("Invalid n8n workflow: node names must be unique.");
  }

  const lines = [`flowchart ${direction}`];
  const title = typeof workflow.name === "string" ? workflow.name.trim() : "";
  if (title) lines.push(`    %% ${title}`);

  const emitted = new Set();
  const edges = [];
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
          edges.push({ sourceId, targetId, kind, outputIndex });
        }
      });
    }
  }

  const groups = findSemanticGroups(nodes, edges);
  const groupedNodeIds = new Set(groups.flatMap((group) => group.nodeIds));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const group of groups) {
    lines.push(`    subgraph ${group.id}["${escapeLabel(group.label)}"]`);
    for (const nodeId of group.nodeIds) {
      const node = nodesById.get(nodeId);
      lines.push(`        %% type: ${shortNodeType(node.type)}`);
      lines.push(`        ${node.id}["${escapeLabel(node.name)}"]`);
    }
    lines.push("    end");
  }
  for (const node of nodes) {
    if (!groupedNodeIds.has(node.id)) {
      lines.push(`    %% type: ${shortNodeType(node.type)}`);
      lines.push(`    ${node.id}["${escapeLabel(node.name)}"]`);
    }
  }
  for (const edge of edges) {
    const label = edgeLabel(edge.kind, edge.outputIndex);
    lines.push(`    ${edge.sourceId}${label ? ` -->|${label}| ` : " --> "}${edge.targetId}`);
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

function findSemanticGroups(nodes, edges) {
  const agentGroups = groupsForRoots(nodes, edges, nodes.filter(isAgent), "agent_group", "Agent", new Set());
  const claimedByAgents = new Set(agentGroups.flatMap((group) => group.nodeIds));
  const ragGroups = groupsForRoots(
    nodes,
    edges,
    nodes.filter(isRagRetriever),
    "rag_group",
    "RAG retrieval",
    claimedByAgents,
  );
  const claimedByEarlierGroups = new Set([
    ...claimedByAgents,
    ...ragGroups.flatMap((group) => group.nodeIds),
  ]);
  const generationGroups = groupsForRoots(
    nodes,
    edges,
    nodes.filter(isAiGenerator),
    "generation_group",
    "AI generation",
    claimedByEarlierGroups,
  );
  return [...agentGroups, ...ragGroups, ...generationGroups];
}

function groupsForRoots(nodes, edges, roots, idPrefix, labelPrefix, claimedNodeIds) {
  const rootIds = new Set(roots.map((node) => node.id));
  if (!rootIds.size) return [];

  const candidates = new Map([...rootIds].map((rootId) => [rootId, new Set()]));
  for (const edge of edges) {
    if (!edge.kind.startsWith("ai_")) continue;
    if (rootIds.has(edge.targetId)) candidates.get(edge.targetId).add(edge.sourceId);
    if (rootIds.has(edge.sourceId)) candidates.get(edge.sourceId).add(edge.targetId);
  }

  const owners = new Map();
  for (const [rootId, helperIds] of candidates) {
    for (const helperId of helperIds) {
      const currentOwners = owners.get(helperId) ?? new Set();
      currentOwners.add(rootId);
      owners.set(helperId, currentOwners);
    }
  }

  return roots
    .map((root, index) => {
      const helperIds = [...candidates.get(root.id)].filter(
        (helperId) => owners.get(helperId).size === 1 && !claimedNodeIds.has(helperId),
      );
      if (!helperIds.length) return null;
      const memberIds = new Set([root.id, ...helperIds]);
      return {
        id: `${idPrefix}_${index + 1}`,
        label: `${labelPrefix}: ${root.name}`,
        nodeIds: nodes.filter((node) => memberIds.has(node.id)).map((node) => node.id),
      };
    })
    .filter(Boolean);
}

function isAgent(node) {
  return node.type === "@n8n/n8n-nodes-langchain.agent";
}

function isRagRetriever(node) {
  return node.mode === "load" && node.type.includes("vectorStore");
}

function isAiGenerator(node) {
  return node.type.endsWith(".informationExtractor");
}

function edgeLabel(kind, outputIndex) {
  return kind === "main" ? (outputIndex === 0 ? "" : `output ${outputIndex + 1}`) : kind;
}

function escapeLabel(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function shortNodeType(value) {
  return value.replaceAll(/\r?\n/g, " ").split(".").at(-1);
}
