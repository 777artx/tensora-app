import type { ToolName } from "@/lib/lab/tools/catalog";
import { toolOnchain, toolPost } from "@/lib/lab/tools/chain";
import { toolScrape, toolSearch, toolSocial } from "@/lib/lab/tools/web";

export const TOOL_RUNNERS: Record<ToolName, (input: Record<string, unknown>) => Promise<unknown>> = {
  search: toolSearch,
  scrape: toolScrape,
  social: toolSocial,
  onchain: toolOnchain,
  post: toolPost,
};
