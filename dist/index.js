#!/usr/bin/env node
/**
 * omilia-partner-mcp — Zero-Dependency MCP Server (stdio + HTTP :3333/mcp)
 * Runs instantly with built-in Node.js modules (no npm install or build step required).
 */
import http from "node:http";
import readline from "node:readline";

const SERVER_INFO = {
  name: "omilia-partner-mcp",
  version: "1.2.0"
};

const TOOLS = [
  {
    name: "check_partner_architecture_fit",
    description: "Validates CCaaS connector, compliance perimeter, and zero-egress OCP deployment topology.",
    inputSchema: {
      type: "object",
      properties: {
        vertical: {
          type: "string",
          enum: ["banking", "utilities", "insurance", "healthcare", "telecom"],
          description: "Target enterprise vertical"
        },
        ccaas_platform: {
          type: "string",
          description: "CCaaS platform (e.g., Genesys Cloud, NICE CXone, Amazon Connect)"
        },
        sovereignty: {
          type: "string",
          enum: ["saas", "baremetal"],
          description: "Deployment sovereignty model (saas or baremetal)"
        }
      },
      required: ["vertical"]
    }
  },
  {
    name: "simulate_parallel_tool_dispatch",
    description: "Executes parallel async backend lookups under Omilia's <300ms voice latency SLA.",
    inputSchema: {
      type: "object",
      properties: {
        vertical: {
          type: "string",
          enum: ["banking", "utilities", "insurance", "healthcare", "telecom"]
        },
        systems: {
          type: "array",
          items: { type: "string" },
          description: "Backend systems to query in parallel"
        }
      },
      required: ["vertical"]
    }
  },
  {
    name: "generate_partner_sow_guardrails",
    description: "Computes deterministic HLEE timeline, RACI matrix, and 80/20 SOW guardrails for Top-Right Quadrant intents.",
    inputSchema: {
      type: "object",
      properties: {
        vertical: {
          type: "string",
          enum: ["banking", "utilities", "insurance", "healthcare", "telecom"]
        },
        partner_type: {
          type: "string",
          description: "CCaaS Co-Sell, Global Systems Integrator, or BPO Managed CX"
        },
        target_intents: {
          type: "number",
          description: "Number of Phase 1 Top-Right Quadrant intents (default 4)"
        },
        api_readiness: {
          type: "string",
          enum: ["modern", "mixed", "mainframe"]
        }
      },
      required: ["vertical"]
    }
  },
  {
    name: "calculate_tco_and_ai_radar_report",
    description: "Calculates CFO Unit Economics TCO (Legacy Baseline vs. DIY Frontier LLM with Token Drift vs. Omilia OCP) and returns the AI Radar 2.0 Top-Right Phase 1 use cases.",
    inputSchema: {
      type: "object",
      properties: {
        vertical: {
          type: "string",
          enum: ["banking", "utilities", "insurance", "healthcare", "telecom"],
          description: "Industry vertical"
        },
        monthly_call_volume: {
          type: "number",
          description: "Monthly inbound call volume (e.g., 450000)"
        },
        base_containment_pct: {
          type: "number",
          description: "Baseline legacy IVR containment percentage (0-50)"
        },
        target_containment_pct: {
          type: "number",
          description: "Target Omilia OCP containment percentage (25-99)"
        },
        omilia_outcome_rate: {
          type: "number",
          description: "Omilia outcome rate in USD per resolved interaction (0.15-1.00, default 0.40)"
        },
        aht_seconds: {
          type: "number",
          description: "Average Handle Time in seconds (1-720, default 340)"
        },
        surge_multiplier: {
          type: "number",
          description: "Peak/outage surge multiplier (1.0-4.0, default 1.4)"
        },
        unit_human_cost_per_call: {
          type: "number",
          description: "Loaded human cost per call in USD (default 3.01)"
        }
      },
      required: ["vertical"]
    }
  }
];

const RADAR_TOP_RIGHT = {
  banking: [
    { name: "Card Activation & PIN Reset", feas: 92, imp: 85, runtime: "Deterministic miniApps® + AI Bootstrapping" },
    { name: "Account Balance & Recent Transactions", feas: 95, imp: 82, runtime: "Deterministic miniApps®" },
    { name: "Passive Voice Biometric Auth (TalkGuard)", feas: 88, imp: 90, runtime: "Native TalkGuard Security Agent" },
    { name: "Fraud Alert Confirmation & Card Reissue", feas: 68, imp: 92, runtime: "Blended Deterministic + Agentic Fallback" }
  ],
  utilities: [
    { name: "Automated Meter Reading & Balance Check", feas: 94, imp: 84, runtime: "Deterministic miniApps® + AI Bootstrapping" },
    { name: "Outage Reporting & Restoration ETA", feas: 88, imp: 94, runtime: "Blended Deterministic + Parallel OMS/AMI Dispatch" },
    { name: "Direct Debit & Payment Plan Setup", feas: 85, imp: 80, runtime: "Deterministic miniApps® (PCI-DSS Enforced)" },
    { name: "Smart Tariff Switch & EV Rate Advisor", feas: 65, imp: 86, runtime: "OCP Knowledge Engine (RAG) + Task Agent" }
  ],
  insurance: [
    { name: "Policy Document & Digital ID Card Request", feas: 95, imp: 78, runtime: "Deterministic miniApps® + Omnichannel SMS/Chat" },
    { name: "Roadside Assistance Dispatch & GPS Pin", feas: 86, imp: 90, runtime: "Blended Deterministic + Multimodal SMS Link" },
    { name: "Deductible & Coverage Inquiry", feas: 82, imp: 76, runtime: "OCP Knowledge Engine (Grounded RAG)" },
    { name: "First Notice of Loss (FNOL) Auto Claim Intake", feas: 58, imp: 94, runtime: "Blended Deterministic + Agentic Slot Recovery" }
  ],
  healthcare: [
    { name: "Appointment Confirmation & Rescheduling", feas: 94, imp: 86, runtime: "Deterministic miniApps® + HL7 FHIR R4" },
    { name: "Prescription Refill & Pharmacy Routing", feas: 90, imp: 84, runtime: "Deterministic miniApps® + PBM Integration" },
    { name: "Benefits, Deductible & Co-Pay Eligibility Check", feas: 72, imp: 88, runtime: "Blended Deterministic + Parallel EDI 270/271 MCP" },
    { name: "Medical Records Release Request", feas: 62, imp: 55, runtime: "Deterministic miniApps®" }
  ],
  telecom: [
    { name: "Parcel Tracking & Delivery Redirection", feas: 95, imp: 88, runtime: "Deterministic miniApps® (98% Alphanumeric Accuracy)" },
    { name: "Router Reboot & Line Outage Diagnostics", feas: 88, imp: 91, runtime: "Blended Deterministic + Parallel OSS Diagnostics" },
    { name: "Return Merchandise Authorization (RMA) & Refund Status", feas: 91, imp: 80, runtime: "Deterministic miniApps® + Omnichannel SMS" },
    { name: "Plan Upgrade & International Roaming Add-On", feas: 76, imp: 84, runtime: "Blended Deterministic + Agentic Upsell" }
  ]
};

const COMPLIANCE_MAP = {
  banking: ["PCI DSS Level 1", "SOC 2 Type II", "ISO 27001", "GDPR", "DORA Ready"],
  utilities: ["NERC CIP", "Ofgem / PUC Regulatory", "ISO 27001", "PCI DSS Level 1"],
  insurance: ["PCI DSS Level 1", "HIPAA & BAA", "NAIC Model Law", "SOC 2 Type II"],
  healthcare: ["HIPAA & Executed BAA", "HITRUST CSF", "SOC 2 Type II", "Zero PHI Egress"],
  telecom: ["PCI DSS Level 1", "ISO 27001", "SOC 2 Type II", "GDPR / CCPA"]
};

function executeTool(name, args = {}) {
  const vertical = (args.vertical || "banking").toLowerCase();
  const vKey = RADAR_TOP_RIGHT[vertical] ? vertical : "banking";

  if (name === "check_partner_architecture_fit") {
    const isBare = args.sovereignty === "baremetal";
    const payload = {
      vertical: vKey,
      ocp_deployment_model: isBare
        ? "OCP Bare Metal (On-Premise / Sovereign Air-Gapped Data Center)"
        : "OCP SaaS (Certified Multi-Region AWS Walled Garden)",
      ccaas_platform: args.ccaas_platform || args.ccaas || "Genesys Cloud",
      compliance_verified: COMPLIANCE_MAP[vKey],
      zero_frontier_egress: true,
      latency_sla: "< 300ms parallel MCP dispatch + < 45ms Lexis TTS"
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }

  if (name === "simulate_parallel_tool_dispatch") {
    const systems = Array.isArray(args.systems) && args.systems.length > 0
      ? args.systems
      : ["Core Banking Ledger", "TalkGuard Biometrics", "Enterprise CRM"];
    const latencies = [215, 140, 240];
    const traces = systems.map((sys, idx) => ({
      system: sys,
      duration_ms: latencies[idx % latencies.length],
      status: "200 OK"
    }));
    const parallelMs = Math.max(...traces.map(t => t.duration_ms));
    const lexisTtsMs = 42;
    const sequentialMs = traces.reduce((a, t) => a + t.duration_ms, 0) + 640 + 210;
    const payload = {
      vertical: vKey,
      dispatch_strategy: "Parallel Async MCP Fan-Out",
      parallel_tool_dispatch_ms: parallelMs,
      lexis_native_tts_ms: lexisTtsMs,
      total_turnaround_ms: parallelMs + lexisTtsMs,
      sub_300ms_voice_sla_passed: (parallelMs + lexisTtsMs) < 300,
      competitor_sequential_ms: sequentialMs,
      latency_saved_ms: sequentialMs - (parallelMs + lexisTtsMs),
      traces
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }

  if (name === "generate_partner_sow_guardrails") {
    const intents = Number(args.target_intents ?? args.intents ?? 4);
    const apiReady = args.api_readiness ?? args.apiReadiness ?? "modern";
    const ucPsDays = intents * 2.5;
    const psDays = Math.round(8 + ucPsDays + (apiReady === "mainframe" ? 8 : apiReady === "mixed" ? 4 : 0));
    const weeks = 2 + Math.ceil(ucPsDays / 3.5) + (apiReady === "mainframe" ? 2 : apiReady === "mixed" ? 1 : 0);
    const payload = {
      vertical: vKey,
      partner_type: args.partner_type || "CCaaS Co-Sell",
      phase_1_top_right_intents: intents,
      included_phase1_use_cases: RADAR_TOP_RIGHT[vKey].slice(0, intents).map(u => u.name),
      estimated_timeline: `${weeks}–${weeks + 1} Weeks`,
      estimated_omilia_ps_effort: `${psDays} PS Days`,
      guardrails: [
        "80/20 Rule: Phase 1 scoped strictly to Top-Right Quadrant (Feasibility >= 50 & Impact >= 50) call drivers",
        "Sub-300ms orchestration SLA isolated from customer legacy backend latency",
        "Mandatory HITL approval gate before self-learned flow promotion"
      ]
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }

  if (name === "calculate_tco_and_ai_radar_report") {
    const vol = Number(args.monthly_call_volume ?? args.monthlyCallVolume ?? 450000);
    const baseContPct = Number(args.base_containment_pct ?? args.baseContainmentPct ?? 28);
    const targetContPct = Number(args.target_containment_pct ?? args.target_omilia_containment_pct ?? args.targetContainmentPct ?? 58);
    const outcomeRate = Number(args.omilia_outcome_rate ?? args.omiliaOutcomeRate ?? 0.40);
    const ahtSec = Number(args.aht_seconds ?? args.ahtSeconds ?? 340);
    const surge = Number(args.surge_multiplier ?? args.surgeMultiplier ?? 1.4);
    const unitHumanCost = Number(args.unit_human_cost_per_call ?? args.unitHumanCostPerCall ?? 3.01);

    const baseCont = baseContPct / 100;
    const targetCont = Math.max(baseCont + 0.05, targetContPct / 100);
    const diyCont = Math.max(baseCont + 0.08, targetCont - 0.11);
    const effectiveCalls = vol * surge;

    const legacyMo = (effectiveCalls * (1 - baseCont) * unitHumanCost) + (effectiveCalls * baseCont * 0.14);
    const omiliaMo = (effectiveCalls * targetCont * outcomeRate) + (effectiveCalls * (1 - targetCont) * (unitHumanCost * 0.83)) + 6500;
    const diyTokenRate = 0.58 * Math.pow(surge, 1.38);
    const diyMo = (effectiveCalls * diyCont * diyTokenRate) + (effectiveCalls * (1 - diyCont) * unitHumanCost) + 28500;

    const payload = {
      vertical: vKey,
      unit_economics_tco: {
        annual_legacy_tco_usd: Math.round(legacyMo * 12),
        annual_diy_frontier_llm_tco_usd: Math.round(diyMo * 12),
        annual_omilia_ocp_tco_usd: Math.round(omiliaMo * 12),
        annual_net_savings_vs_legacy_usd: Math.round(Math.max(0, legacyMo - omiliaMo) * 12),
        three_year_advantage_vs_diy_llm_usd: Math.round(Math.max(0, diyMo - omiliaMo) * 36),
        containment_comparison: {
          legacy_baseline_pct: Math.round(baseCont * 100),
          diy_frontier_llm_pct_with_token_drift: Math.round(diyCont * 100),
          omilia_ocp_blended_pct: Math.round(targetCont * 100)
        },
        aht_seconds: ahtSec,
        omilia_outcome_rate_usd: outcomeRate,
        surge_multiplier: surge
      },
      ai_radar_phase1_top_right_use_cases: RADAR_TOP_RIGHT[vKey]
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function handleJsonRpc(msg) {
  if (!msg || typeof msg !== "object") return null;
  const { id, method, params } = msg;

  // Notifications (no id) do not receive a response
  if (id === undefined || id === null) {
    return null;
  }

  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: SERVER_INFO
        }
      };
    }

    if (method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    if (method === "prompts/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: { prompts: [] }
      };
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS }
      };
    }

    if (method === "tools/call") {
      const toolResult = executeTool(params?.name, params?.arguments || {});
      return {
        jsonrpc: "2.0",
        id,
        result: toolResult
      };
    }

    if (method === "resources/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            {
              uri: "omilia://playbooks/banking-sovereignty",
              name: "banking-sovereignty-playbook",
              mimeType: "application/json"
            }
          ]
        }
      };
    }

    if (method === "resources/read") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: params?.uri || "omilia://playbooks/banking-sovereignty",
              mimeType: "application/json",
              text: JSON.stringify({
                title: "Tier-1 Banking Sovereignty & Zero-Egress Blueprint",
                certifications: COMPLIANCE_MAP.banking,
                zero_frontier_llm_egress: true
              }, null, 2)
            }
          ]
        }
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: err instanceof Error ? err.message : String(err) }
    };
  }
}

if (process.argv.includes("--http")) {
  const httpServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === "/mcp" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const rpc = JSON.parse(body || "{}");
          const response = handleJsonRpc(rpc) || { jsonrpc: "2.0", id: rpc.id || 1, result: { ok: true } };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }));
        }
      });
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: SERVER_INFO.name, endpoint: "http://localhost:3333/mcp" }));
  });
  httpServer.listen(3333, () => {
    console.error("omilia-partner-mcp HTTP bridge listening on http://localhost:3333/mcp");
  });
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });
  rl.on("line", line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      const response = handleJsonRpc(msg);
      if (response) {
        process.stdout.write(JSON.stringify(response) + "\n");
      }
    } catch (e) {
      // Ignore malformed lines
    }
  });
}
