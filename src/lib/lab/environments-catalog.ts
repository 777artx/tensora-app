const CATEGORIES = [
  "Math",
  "Code",
  "Software Engineering",
  "Reasoning",
  "Search",
  "Tool Use",
] as const;

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

/** 55 unique author handles (displayed with @ prefix in UI). */
const AUTHORS = [
  "alex-chen",
  "rl-labs",
  "openenv",
  "maria-kim",
  "dev-eval",
  "synth-bench",
  "nora-patel",
  "agentforge",
  "codecraft-io",
  "theorem-lab",
  "jordan-lee",
  "eval-hub",
  "priya-sharma",
  "toolbench",
  "reasoning-co",
  "sam-ortiz",
  "tensora-ops",
  "mathbench",
  "swe-research",
  "citekit",
  "lucas-nguyen",
  "env-studio",
  "hop-qa",
  "debug-dojo",
  "tensor-play",
  "maya-foster",
  "repo-gym",
  "search-agent",
  "calc-tools",
  "logic-lattice",
  "kai-watanabe",
  "patchworks",
  "gsm-pro",
  "trajectory-ai",
  "emma-clark",
  "prime-eval",
  "algebra-bot",
  "api-orchestra",
  "chain-of-thought",
  "oliver-banks",
  "unit-test-lab",
  "web-retrieval",
  "function-caller",
  "contest-math",
  "refactor-radar",
  "zara-hussain",
  "deduction-deck",
  "browse-bench",
  "multi-tool",
  "proof-pilot",
  "issue-tracker",
  "fact-finder",
  "workflow-env",
  "numeric-nav",
  "merge-queue",
] as const;

type Category = (typeof CATEGORIES)[number];

type EnvTemplate = {
  name: string;
  slug: string;
  description: string;
  rewardType: string;
  exampleTask: string;
  exampleAnswer: string;
  tags: string[];
};

const TEMPLATES: Record<Category, EnvTemplate[]> = {
  Math: [
    {
      name: "GSM8K Arithmetic",
      slug: "gsm8k-arithmetic",
      description: "Grade-school word problems with multi-step arithmetic.",
      rewardType: "Correct Answer",
      exampleTask: "A store sells 3 packs of 12 pencils. How many pencils total?",
      exampleAnswer: "36",
      tags: ["math", "gsm8k", "word-problems"],
    },
    {
      name: "Contest Algebra",
      slug: "contest-algebra",
      description: "AMC-style algebra and number theory puzzles.",
      rewardType: "Exact Match",
      exampleTask: "Solve for x: 2x + 5 = 17",
      exampleAnswer: "6",
      tags: ["math", "algebra", "contest"],
    },
    {
      name: "Fraction Mastery",
      slug: "fraction-mastery",
      description: "Add, subtract, and compare rational numbers.",
      rewardType: "Correct Answer",
      exampleTask: "What is 3/4 + 2/3 in lowest terms?",
      exampleAnswer: "17/12",
      tags: ["math", "fractions", "rational"],
    },
    {
      name: "Geometry Proofs Lite",
      slug: "geometry-proofs-lite",
      description: "Short Euclidean geometry with angle and area reasoning.",
      rewardType: "Correct Answer",
      exampleTask: "Find the interior angle of a regular pentagon.",
      exampleAnswer: "108",
      tags: ["math", "geometry", "proofs"],
    },
    {
      name: "MATH Dataset Bench",
      slug: "math-dataset-bench",
      description: "Competition math from algebra through precalculus.",
      rewardType: "Exact Match",
      exampleTask: "Evaluate log base 2 of 64.",
      exampleAnswer: "6",
      tags: ["math", "competition", "precalc"],
    },
    {
      name: "Numeric Word Problems",
      slug: "numeric-word-problems",
      description: "Extract quantities and compute final answers from prose.",
      rewardType: "Correct Answer",
      exampleTask: "Train A leaves at 9am at 60 mph. When does it reach 180 miles?",
      exampleAnswer: "12:00 PM",
      tags: ["math", "word-problems", "reasoning"],
    },
    {
      name: "Mental Math Sprint",
      slug: "mental-math-sprint",
      description: "Fast arithmetic chains without calculator tools.",
      rewardType: "Correct Answer",
      exampleTask: "Compute 15 × 17 + 8",
      exampleAnswer: "263",
      tags: ["math", "arithmetic", "speed"],
    },
    {
      name: "Probability Basics",
      slug: "probability-basics",
      description: "Coins, dice, and simple conditional probability.",
      rewardType: "Correct Answer",
      exampleTask: "P(at least one head in two fair coin flips)?",
      exampleAnswer: "3/4",
      tags: ["math", "probability", "stats"],
    },
    {
      name: "Linear Equations",
      slug: "linear-equations",
      description: "Systems of linear equations and inequalities.",
      rewardType: "Exact Match",
      exampleTask: "Solve: x + y = 10, x - y = 2",
      exampleAnswer: "x=6, y=4",
      tags: ["math", "linear", "systems"],
    },
    {
      name: "Unit Conversion Math",
      slug: "unit-conversion-math",
      description: "Convert between metric and imperial with word context.",
      rewardType: "Correct Answer",
      exampleTask: "How many cm in 2.5 meters?",
      exampleAnswer: "250",
      tags: ["math", "units", "conversion"],
    },
    {
      name: "Prime Factorization",
      slug: "prime-factorization",
      description: "Factor integers and compute GCD/LCM.",
      rewardType: "Exact Match",
      exampleTask: "Prime factorization of 360",
      exampleAnswer: "2³ × 3² × 5",
      tags: ["math", "number-theory", "factors"],
    },
    {
      name: "Calculus Derivatives",
      slug: "calculus-derivatives",
      description: "Symbolic differentiation of polynomials and trig.",
      rewardType: "Exact Match",
      exampleTask: "Derivative of x³ + 2x",
      exampleAnswer: "3x² + 2",
      tags: ["math", "calculus", "derivatives"],
    },
  ],
  Code: [
    {
      name: "Python Bug Hunt",
      slug: "python-bug-hunt",
      description: "Find and fix subtle bugs in Python functions.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Fix IndexError in list comprehension filter",
      exampleAnswer: "bounds check before access",
      tags: ["code", "python", "debugging"],
    },
    {
      name: "JavaScript Fix-it",
      slug: "javascript-fix-it",
      description: "Repair broken JS/TS snippets for passing tests.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Fix async/await missing await on fetch",
      exampleAnswer: "await response.json()",
      tags: ["code", "javascript", "async"],
    },
    {
      name: "Algorithm Repair",
      slug: "algorithm-repair",
      description: "Correct off-by-one and logic errors in classic algorithms.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Fix binary search mid calculation",
      exampleAnswer: "mid = lo + (hi - lo) // 2",
      tags: ["code", "algorithms", "debugging"],
    },
    {
      name: "SQL Query Fix",
      slug: "sql-query-fix",
      description: "Rewrite queries to match expected result sets.",
      rewardType: "Query Output Match",
      exampleTask: "Fix JOIN that drops null foreign keys",
      exampleAnswer: "LEFT JOIN instead of INNER",
      tags: ["code", "sql", "databases"],
    },
    {
      name: "Regex Rewrite",
      slug: "regex-rewrite",
      description: "Craft patterns that pass hidden string-matching tests.",
      rewardType: "Pattern Match",
      exampleTask: "Match valid IPv4 addresses",
      exampleAnswer: "^(\\d{1,3}\\.){3}\\d{1,3}$",
      tags: ["code", "regex", "strings"],
    },
    {
      name: "Type Error Clinic",
      slug: "type-error-clinic",
      description: "Resolve TypeScript type errors in small modules.",
      rewardType: "Typecheck Pass",
      exampleTask: "Fix generic constraint on map callback",
      exampleAnswer: "extends keyof T",
      tags: ["code", "typescript", "types"],
    },
    {
      name: "LeetCode Lite",
      slug: "leetcode-lite",
      description: "Implement optimal solutions for array and string tasks.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Two-sum with O(n) time",
      exampleAnswer: "hash map lookup",
      tags: ["code", "leetcode", "interview"],
    },
    {
      name: "API Handler Patch",
      slug: "api-handler-patch",
      description: "Fix REST handlers for correct status codes and payloads.",
      rewardType: "Integration Tests Pass",
      exampleTask: "Return 404 when resource missing",
      exampleAnswer: "check exists before update",
      tags: ["code", "api", "backend"],
    },
    {
      name: "Memory Leak Fix",
      slug: "memory-leak-fix",
      description: "Close resources and clear listeners in Node snippets.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Remove event listener on component unmount",
      exampleAnswer: "return cleanup in useEffect",
      tags: ["code", "node", "memory"],
    },
    {
      name: "Concurrency Bug",
      slug: "concurrency-bug",
      description: "Fix race conditions in async Python code.",
      rewardType: "Unit Tests Pass",
      exampleTask: "Serialize access to shared counter",
      exampleAnswer: "asyncio.Lock around increment",
      tags: ["code", "async", "concurrency"],
    },
    {
      name: "Test Coverage Gap",
      slug: "test-coverage-gap",
      description: "Add missing edge-case tests and minimal fixes.",
      rewardType: "Coverage + Tests Pass",
      exampleTask: "Handle empty input in parser",
      exampleAnswer: "early return []",
      tags: ["code", "testing", "tdd"],
    },
  ],
  "Software Engineering": [
    {
      name: "SWE-bench Lite",
      slug: "swe-bench-lite",
      description: "Minimal repo patches that make failing tests pass.",
      rewardType: "Tests + Diff Quality",
      exampleTask: "Fix datetime timezone handling in utils",
      exampleAnswer: "use timezone-aware constructor",
      tags: ["swe", "repos", "patches"],
    },
    {
      name: "Issue Resolver",
      slug: "issue-resolver",
      description: "Implement GitHub issue fixes in small open-source repos.",
      rewardType: "CI Green",
      exampleTask: "Close #142: null guard on config load",
      exampleAnswer: "default empty object",
      tags: ["swe", "github", "issues"],
    },
    {
      name: "Refactor Safe",
      slug: "refactor-safe",
      description: "Restructure code without changing external behavior.",
      rewardType: "Tests Pass + Lint",
      exampleTask: "Extract duplicate validation into helper",
      exampleAnswer: "shared validateInput()",
      tags: ["swe", "refactor", "clean-code"],
    },
    {
      name: "Dependency Bump",
      slug: "dependency-bump",
      description: "Upgrade packages and fix breaking API changes.",
      rewardType: "Build + Tests Pass",
      exampleTask: "Migrate axios 0.x to 1.x interceptors",
      exampleAnswer: "update interceptor signature",
      tags: ["swe", "dependencies", "migration"],
    },
    {
      name: "Config Fix",
      slug: "config-fix",
      description: "Repair CI/CD and build configs for green pipelines.",
      rewardType: "CI Green",
      exampleTask: "Fix GitHub Actions Node version matrix",
      exampleAnswer: "node-version: [18, 20]",
      tags: ["swe", "ci", "devops"],
    },
    {
      name: "Docstring Duty",
      slug: "docstring-duty",
      description: "Add docs and type hints while preserving behavior.",
      rewardType: "Tests + Doc Lint",
      exampleTask: "Document public API with examples",
      exampleAnswer: "Google-style docstrings",
      tags: ["swe", "docs", "python"],
    },
    {
      name: "Merge Conflict Resolver",
      slug: "merge-conflict-resolver",
      description: "Resolve conflicts and keep tests passing.",
      rewardType: "Tests Pass",
      exampleTask: "Merge feature branch into main cleanly",
      exampleAnswer: "keep both imports, dedupe logic",
      tags: ["swe", "git", "merge"],
    },
    {
      name: "Feature Flag Wiring",
      slug: "feature-flag-wiring",
      description: "Gate new behavior behind flags with fallback paths.",
      rewardType: "Tests Pass",
      exampleTask: "Add USE_NEW_PARSER flag with legacy path",
      exampleAnswer: "if/else on env var",
      tags: ["swe", "feature-flags", "backend"],
    },
    {
      name: "Hotfix Patch",
      slug: "hotfix-patch",
      description: "Minimal production fixes under time pressure.",
      rewardType: "Regression Tests Pass",
      exampleTask: "Patch SQL injection in search endpoint",
      exampleAnswer: "parameterized query",
      tags: ["swe", "security", "hotfix"],
    },
    {
      name: "Monorepo Navigate",
      slug: "monorepo-navigate",
      description: "Cross-package changes with workspace-aware builds.",
      rewardType: "Build + Tests Pass",
      exampleTask: "Update shared types used by 3 packages",
      exampleAnswer: "publish types package first",
      tags: ["swe", "monorepo", "typescript"],
    },
  ],
  Reasoning: [
    {
      name: "Multi-hop QA",
      slug: "multi-hop-qa",
      description: "Chain facts across short passages to answer questions.",
      rewardType: "Exact Match",
      exampleTask: "Who co-founded the lab that published paper X?",
      exampleAnswer: "Named entity match",
      tags: ["reasoning", "multi-hop", "qa"],
    },
    {
      name: "Logic Grid Puzzles",
      slug: "logic-grid-puzzles",
      description: "Deduce assignments from constraint clues.",
      rewardType: "Exact Match",
      exampleTask: "Which person owns the cat?",
      exampleAnswer: "Alice",
      tags: ["reasoning", "logic", "puzzles"],
    },
    {
      name: "Causal Inference",
      slug: "causal-inference",
      description: "Identify cause vs correlation in scenario text.",
      rewardType: "Multiple Choice",
      exampleTask: "Did rainfall cause the crop yield increase?",
      exampleAnswer: "No, irrigation was added",
      tags: ["reasoning", "causal", "nlp"],
    },
    {
      name: "Analogy Completion",
      slug: "analogy-completion",
      description: "Finish word analogies with semantic consistency.",
      rewardType: "Exact Match",
      exampleTask: "hot : cold :: up : ?",
      exampleAnswer: "down",
      tags: ["reasoning", "analogy", "language"],
    },
    {
      name: "Table Reasoning",
      slug: "table-reasoning",
      description: "Answer questions over structured tables and charts.",
      rewardType: "Exact Match",
      exampleTask: "Which quarter had highest revenue growth?",
      exampleAnswer: "Q3",
      tags: ["reasoning", "tables", "data"],
    },
    {
      name: "Temporal Ordering",
      slug: "temporal-ordering",
      description: "Sort events into correct chronological order.",
      rewardType: "Exact Sequence",
      exampleTask: "Order: treaty signed, war declared, peace talks",
      exampleAnswer: "war → treaty → talks",
      tags: ["reasoning", "temporal", "events"],
    },
    {
      name: "Counterfactual Reason",
      slug: "counterfactual-reason",
      description: "Predict outcomes under hypothetical changes.",
      rewardType: "Exact Match",
      exampleTask: "If price doubled, demand would…",
      exampleAnswer: "decrease per supply-demand",
      tags: ["reasoning", "counterfactual", "economics"],
    },
    {
      name: "Syllogism Validator",
      slug: "syllogism-validator",
      description: "Judge validity of deductive argument forms.",
      rewardType: "Valid / Invalid",
      exampleTask: "All A are B. All B are C. Therefore?",
      exampleAnswer: "Valid: All A are C",
      tags: ["reasoning", "logic", "deduction"],
    },
    {
      name: "Commonsense QA",
      slug: "commonsense-qa",
      description: "Everyday physical and social reasoning questions.",
      rewardType: "Exact Match",
      exampleTask: "Why would wet pavement be slippery?",
      exampleAnswer: "reduced friction",
      tags: ["reasoning", "commonsense", "physical"],
    },
    {
      name: "Reading Comprehension",
      slug: "reading-comprehension",
      description: "Answer questions about single-paragraph passages.",
      rewardType: "Exact Match",
      exampleTask: "What motivated the protagonist's decision?",
      exampleAnswer: "fear of losing the contract",
      tags: ["reasoning", "reading", "comprehension"],
    },
  ],
  Search: [
    {
      name: "Search & Cite",
      slug: "search-and-cite",
      description: "Use search tools, answer questions, and cite sources.",
      rewardType: "Answer + Citation",
      exampleTask: "When was the Transformer paper published?",
      exampleAnswer: "2017 (Attention Is All You Need)",
      tags: ["search", "citation", "tools"],
    },
    {
      name: "Fact Verification",
      slug: "fact-verification",
      description: "Verify claims against retrieved web snippets.",
      rewardType: "Supported / Refuted",
      exampleTask: "Did Company X acquire Y in 2024?",
      exampleAnswer: "Refuted, deal fell through",
      tags: ["search", "fact-check", "verification"],
    },
    {
      name: "Fresh News QA",
      slug: "fresh-news-qa",
      description: "Answer time-sensitive questions with recent sources.",
      rewardType: "Answer + Citation",
      exampleTask: "Latest Fed interest rate decision?",
      exampleAnswer: "held at 5.25% (source: …)",
      tags: ["search", "news", "current"],
    },
    {
      name: "Academic Lookup",
      slug: "academic-lookup",
      description: "Find papers, authors, and citation counts.",
      rewardType: "Exact Match + DOI",
      exampleTask: "First author of BERT paper?",
      exampleAnswer: "Jacob Devlin",
      tags: ["search", "academic", "papers"],
    },
    {
      name: "Product Compare",
      slug: "product-compare",
      description: "Compare specs from multiple search results.",
      rewardType: "Structured Answer",
      exampleTask: "Which GPU has more VRAM: A or B?",
      exampleAnswer: "B. 24GB vs 16GB",
      tags: ["search", "comparison", "products"],
    },
    {
      name: "Local Business Finder",
      slug: "local-business-finder",
      description: "Locate businesses matching constraints in a city.",
      rewardType: "Exact Match",
      exampleTask: "24h pharmacy near downtown Austin",
      exampleAnswer: "Named business + address",
      tags: ["search", "local", "geo"],
    },
    {
      name: "Regulation Lookup",
      slug: "regulation-lookup",
      description: "Find relevant regulations and summarize requirements.",
      rewardType: "Answer + Citation",
      exampleTask: "GDPR data retention minimum rules?",
      exampleAnswer: "Summary with Article 5 cite",
      tags: ["search", "legal", "compliance"],
    },
    {
      name: "Code Search QA",
      slug: "code-search-qa",
      description: "Search docs and repos to answer implementation questions.",
      rewardType: "Answer + Link",
      exampleTask: "How to enable streaming in OpenAI SDK?",
      exampleAnswer: "stream=True parameter",
      tags: ["search", "code", "docs"],
    },
    {
      name: "Multi-source Synthesis",
      slug: "multi-source-synthesis",
      description: "Combine 3+ sources into a coherent summary.",
      rewardType: "Answer + Citations",
      exampleTask: "Summarize pros/cons of RAG vs fine-tuning",
      exampleAnswer: "Balanced summary with 3 cites",
      tags: ["search", "synthesis", "rag"],
    },
  ],
  "Tool Use": [
    {
      name: "Calculator Chain",
      slug: "calculator-chain",
      description: "Call calculators and unit converters in sequence.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Convert 72°F to °C then round",
      exampleAnswer: "22",
      tags: ["tools", "calculator", "trajectory"],
    },
    {
      name: "API Orchestration",
      slug: "api-orchestration",
      description: "Call REST APIs in the correct order with auth.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Create user then assign role via API",
      exampleAnswer: "POST /users → POST /roles/assign",
      tags: ["tools", "api", "agents"],
    },
    {
      name: "SQL Agent",
      slug: "sql-agent",
      description: "Query databases via tool calls to answer questions.",
      rewardType: "Query + Answer Match",
      exampleTask: "Top 5 customers by revenue last quarter",
      exampleAnswer: "SELECT … ORDER BY revenue DESC LIMIT 5",
      tags: ["tools", "sql", "database"],
    },
    {
      name: "File System Agent",
      slug: "file-system-agent",
      description: "Read, grep, and edit files through sandbox tools.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Find config key MAX_RETRIES in repo",
      exampleAnswer: "grep + read config.yaml",
      tags: ["tools", "filesystem", "agents"],
    },
    {
      name: "Weather Workflow",
      slug: "weather-workflow",
      description: "Geocode location then fetch forecast data.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Tomorrow's high in San Francisco?",
      exampleAnswer: "geocode → forecast → parse",
      tags: ["tools", "weather", "workflow"],
    },
    {
      name: "Email Draft Agent",
      slug: "email-draft-agent",
      description: "Lookup contact info then compose formatted email.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Schedule meeting with project lead",
      exampleAnswer: "lookup contact → draft → send",
      tags: ["tools", "email", "workflow"],
    },
    {
      name: "Spreadsheet Tools",
      slug: "spreadsheet-tools",
      description: "Read cells, compute aggregates, write results back.",
      rewardType: "Cell Value Match",
      exampleTask: "Sum column B for rows where A='Active'",
      exampleAnswer: "SUMIF formula or tool chain",
      tags: ["tools", "spreadsheet", "data"],
    },
    {
      name: "Browser Automation Lite",
      slug: "browser-automation-lite",
      description: "Navigate pages and extract structured data.",
      rewardType: "Extracted Data Match",
      exampleTask: "Get price from product page",
      exampleAnswer: "navigate → select → parse price",
      tags: ["tools", "browser", "scraping"],
    },
    {
      name: "Multi-tool Planning",
      slug: "multi-tool-planning",
      description: "Plan and execute tool sequences for compound tasks.",
      rewardType: "Correct Tool Trajectory",
      exampleTask: "Book flight + hotel under $800 total",
      exampleAnswer: "search flights → search hotels → compare",
      tags: ["tools", "planning", "agents"],
    },
    {
      name: "Code Interpreter",
      slug: "code-interpreter",
      description: "Run Python in sandbox to solve numeric tasks.",
      rewardType: "Output Match",
      exampleTask: "Plot histogram of sample data",
      exampleAnswer: "execute code → return chart path",
      tags: ["tools", "python", "sandbox"],
    },
  ],
};

/** Category slot counts (sum = 60). */
const CATEGORY_SLOTS: Category[] = [
  ...Array<Category>(12).fill("Math"),
  ...Array<Category>(11).fill("Code"),
  ...Array<Category>(10).fill("Software Engineering"),
  ...Array<Category>(9).fill("Reasoning"),
  ...Array<Category>(9).fill("Search"),
  ...Array<Category>(9).fill("Tool Use"),
];

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(unit(seed) * arr.length)];
}

function randInt(seed: number, min: number, max: number) {
  return min + Math.floor(unit(seed) * (max - min + 1));
}

function dateIn2026(seed: number) {
  const start = Date.UTC(2026, 0, 1);
  const end = Date.UTC(2026, 7, 25);
  const span = Math.floor((end - start) / 86400000);
  const offset = Math.floor(unit(seed) * (span + 1));
  return new Date(start + offset * 86400000).toISOString().slice(0, 10);
}

export function buildEnvironmentsCatalog() {
  const seen: Partial<Record<Category, number>> = {};
  return CATEGORY_SLOTS.map((category, i) => {
    const templates = TEMPLATES[category];
    const idx = seen[category] || 0;
    seen[category] = idx + 1;
    const template = templates[idx % templates.length];
    const variant = idx >= templates.length ? ` v${Math.floor(idx / templates.length) + 1}` : "";
    const seed = hashSeed(`env-catalog:${i}:${category}:${template.slug}`);

    const author = AUTHORS[i % AUTHORS.length];
    const difficulty = pick(DIFFICULTIES, seed + 3);
    const taskCount = randInt(seed + 5, 12, 96);
    const usageCount = randInt(seed + 7, 3, 86);
    const stars = randInt(seed + 11, 2, 38);

    const slugSuffix = idx >= templates.length ? `-${idx}` : "";
    const id = `env-${category.toLowerCase().replace(/\s+/g, "-")}-${template.slug}${slugSuffix}`.replace(
      /[^a-z0-9-]/g,
      ""
    );

    return {
      id,
      slug: `${template.slug}${slugSuffix}`,
      name: template.name + variant,
      description: template.description,
      category,
      taskCount,
      rewardType: template.rewardType,
      exampleTask: template.exampleTask,
      exampleAnswer: template.exampleAnswer,
      author,
      stars,
      difficulty,
      updatedAt: dateIn2026(seed + 13),
      tags: [...template.tags],
      usageCount,
    };
  });
}

export const ENVIRONMENTS_CATALOG = buildEnvironmentsCatalog();
