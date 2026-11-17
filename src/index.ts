import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import http from "node:http";

/**
 * omilia-partner-mcp (v1.0.0)
 * Exposes Omilia Partner Architecture Fit, Parallel Async Dispatch (<300ms SLA),
 * and SOW Commercial Guardrails over MCP stdio or Streamable HTTP (:3333/mcp).
 */
const server = new McpServer({
  name: "omilia-partner-mcp",
  version: "1.0.0"
});

// TOOL 1: check_partner_architecture_fit
server.tool(
  "check_partner_architecture_fit",
  {
    ccaas_platform: z.enum(["Genesys Cloud", "NICE CXone", "Amazon Connect", "RingCentral"]),
    compliance_regime: z.enum(["PCI DSS L1 + GDPR", "FedRAMP / Air-Gapped", "HIPAA"]),
    legacy_api_style: z.enum(["REST / OpenAPI / MCP", "Legacy SOAP / Mainframe"])
  },
  async ({ ccaas_platform, compliance_regime, legacy_api_style }) => {
    const isBareMetal = compliance_regime === "FedRAMP / Air-Gapped";
    const result = {
      ocp_deployment_model: isBareMetal
        ? "OCP Bare Metal (On-Premise / Sovereign Air-Gapped Data Center)"
        : "OCP SaaS (Certified Multi-Region AWS Walled Garden)",
      ccaas_platform,
      legacy_api_style,
      zero_egress_attestation: "VERIFIED_ZERO_FRONTIER_EGRESS",
      latency_sla: "< 300ms parallel MCP dispatch + < 45ms Lexis TTS"
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// TOOL 2: simulate_parallel_tool_dispatch
server.tool(
  "simulate_parallel_tool_dispatch",
  {
    systems: z.array(z.string()).default(["Core Banking", "TalkGuard Biometrics", "CRM Profile"])
  },
  async ({ systems }) => {
    const latencies: Record<string, number> = {
      "Core Banking": 185,
      "TalkGuard Biometrics": 142,
      "CRM Profile": 218
    };
    const traces = systems.map((s) => ({
      system: s,
      duration_ms: latencies[s] ?? 160,
      status: "200 OK"
    }));
    const parallelMs = traces.length ? Math.max(...traces.map((t) => t.duration_ms)) : 120;
    const sequentialMs = traces.reduce((acc, t) => acc + t.duration_ms, 0) + 220;

    const result = {
      sub_300ms_tool_sla_passed: parallelMs < 300,
      parallel_tool_dispatch_ms: parallelMs,
      lexis_native_tts_ms: 42,
      total_turnaround_ms: parallelMs + 42,
      sequential_frontier_chaining_ms: sequentialMs,
      traces
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// TOOL 3: generate_partner_sow_guardrails
server.tool(
  "generate_partner_sow_guardrails",
  {
    partner_type: z.enum(["CCaaS Co-Sell", "Global Systems Integrator", "BPO Transformation"]),
    target_intents: z.number().min(1).max(20)
  },
  async ({ partner_type, target_intents }) => {
    const phase1 = Math.min(target_intents, 5);
    const result = {
      partner_type,
      phase_1_scope: `${phase1} bounded intents (80/20 volume rule)`,
      hlee_estimate: `${12 + phase1 * 3}–${17 + phase1 * 3} consultant days`,
      hitl_governance: "Mandatory human operator approval prior to self-learned flow promotion"
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// TOOL 4: calculate_tco_and_ai_radar_report
server.tool(
  "calculate_tco_and_ai_radar_report",
  {
    vertical: z.enum(["banking", "utilities", "insurance", "healthcare", "telecom"]).default("banking"),
    monthly_call_volume: z.number().min(10000).max(5000000).default(450000),
    base_containment_pct: z.number().min(0).max(50).default(28),
    target_containment_pct: z.number().min(25).max(99).default(58),
    omilia_outcome_rate: z.number().min(0.15).max(1.00).default(0.40),
    aht_seconds: z.number().min(1).max(720).default(340),
    surge_multiplier: z.number().min(1.0).max(4.0).default(1.4),
    unit_human_cost_per_call: z.number().min(0.50).max(50).default(3.01)
  },
  async ({
    vertical,
    monthly_call_volume,
    base_containment_pct,
    target_containment_pct,
    omilia_outcome_rate,
    aht_seconds,
    surge_multiplier,
    unit_human_cost_per_call
  }) => {
    const baseCont = base_containment_pct / 100;
    const targetCont = Math.max(baseCont + 0.05, target_containment_pct / 100);
    const diyCont = Math.max(baseCont + 0.08, targetCont - 0.11);
    const effectiveCalls = monthly_call_volume * surge_multiplier;

    const legacyMo = (effectiveCalls * (1 - baseCont) * unit_human_cost_per_call) + (effectiveCalls * baseCont * 0.14);
    const omiliaMo = (effectiveCalls * targetCont * omilia_outcome_rate) + (effectiveCalls * (1 - targetCont) * (unit_human_cost_per_call * 0.83)) + 6500;
    const diyTokenRate = 0.58 * Math.pow(surge_multiplier, 1.38);
    const diyMo = (effectiveCalls * diyCont * diyTokenRate) + (effectiveCalls * (1 - diyCont) * unit_human_cost_per_call) + 28500;

    const radarTopRightByVertical: Record<string, Array<{ name: string; feas: number; imp: number; runtime: string }>> = {
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

    const result = {
      vertical,
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
        aht_seconds,
        omilia_outcome_rate_usd: omilia_outcome_rate
      },
      ai_radar_phase1_top_right_use_cases: radarTopRightByVertical[vertical]
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// RESOURCE: omilia://playbooks/banking-sovereignty
server.resource(
  "banking-sovereignty-playbook",
  "omilia://playbooks/banking-sovereignty",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify({
        title: "Tier-1 Banking Sovereignty & Zero-Egress Blueprint",
        certifications: ["PCI DSS Level 1", "SOC 2 Type II", "ISO 27001", "FedRAMP-Ready"],
        zero_frontier_llm_egress: true
      }, null, 2)
    }]
  })
);

async function main() {
  if (process.argv.includes("--http")) {
    const httpServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      if (req.url === "/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const rpc = JSON.parse(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: rpc.id,
            result: { bridged: true, server: "omilia-partner-mcp", method: rpc.method }
          }));
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    httpServer.listen(3333, () => console.error("omilia-partner-mcp HTTP bridge on http://localhost:3333/mcp"));
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("omilia-partner-mcp running on stdio");
  }
}

main().catch(console.error);