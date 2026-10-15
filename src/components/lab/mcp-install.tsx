"use client";

import { useState } from "react";
import { LabDarkModule } from "@/components/lab/ui";
import { TENSORA_APP_URL } from "@/lib/lab/public-url";

const CLIENTS = ["Claude Code", "Cursor", "Codex"] as const;
type Client = (typeof CLIENTS)[number];

function snippet(client: Client, url: string, key: string) {
  if (client === "Claude Code") {
    return `claude mcp add --transport http tensora ${url} \\\n  --header "Authorization: Bearer ${key}"`;
  }
  if (client === "Cursor") {
    return `// ~/.cursor/mcp.json
{
  "mcpServers": {
    "tensora": {
      "url": "${url}",
      "headers": { "Authorization": "Bearer ${key}" }
    }
  }
}`;
  }
  return `# ~/.codex/config.toml
[mcp_servers.tensora]
url = "${url}"
http_headers = { Authorization = "Bearer ${key}" }`;
}

export function McpInstall({ apiKey }: { apiKey?: string | null }) {
  const [client, setClient] = useState<Client>("Claude Code");
  const [copied, setCopied] = useState(false);
  const code = snippet(client, `${TENSORA_APP_URL}/api/mcp`, apiKey || "tsa_…");

  return (
    <LabDarkModule className="p-5">
      <h3 className="m-0 text-[14px] font-semibold text-[var(--dark-fg)]">Use Olora in your coding agent</h3>
      <p className="m-0 mt-1 text-[12px] text-[var(--dark-muted)]">
        One MCP server gives the agent models, search, scrape, social, and onchain tools. Every call is paid
        from this key&apos;s credits.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Client">
        {CLIENTS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={client === c}
            onClick={() => {
              setClient(c);
              setCopied(false);
            }}
            className={`rounded-full px-3 py-1 text-[12px] ${
              client === c
                ? "bg-grad text-white"
                : "border border-white/10 text-[var(--dark-muted)] hover:text-[var(--dark-fg)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[11px] text-[var(--dark-muted)]">
        {code}
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
        }}
        className="mt-2 text-[12px] text-[var(--orange)] underline-offset-2 hover:underline"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </LabDarkModule>
  );
}
