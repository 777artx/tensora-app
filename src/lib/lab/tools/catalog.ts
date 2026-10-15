/** Paid tools. Prices are whole cents so the owner ledger (2 decimals) bills exactly. */
export const TOOL_CATALOG = {
  search: { priceUsd: 0.01, summary: "Web search. Returns titles, URLs, and snippets." },
  scrape: { priceUsd: 0.01, summary: "Fetch a public URL and return readable text." },
  social: { priceUsd: 0.02, summary: "Recent posts for a query from Reddit and Hacker News." },
  onchain: {
    priceUsd: 0.01,
    summary: "Read-only chain data: balances, tx status, token prices (Base, Robinhood, Solana).",
  },
  post: {
    priceUsd: 0.01,
    summary: "Send a message to a webhook you own (Discord, Slack, or any HTTPS endpoint).",
  },
} as const;

export type ToolName = keyof typeof TOOL_CATALOG;

export function isToolName(v: string): v is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOL_CATALOG, v);
}
