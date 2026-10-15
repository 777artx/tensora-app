/**
 * Olora Cloud shell — nav IA, home copy, GPU deep-links, training/eval wiring.
 * Injected into Prime scrape HTML. Does not invent Chat/Earn panels.
 */
(function () {
  "use strict";

  var MENU_BTN =
    'peer/menu-button relative flex w-full items-center gap-2 overflow-hidden rounded-[2px] p-2 text-left font-normal text-[#d0d3d8] outline-none ring-sidebar-ring focus-visible:ring-2 active:bg-white/[0.08] active:text-[#d0d3d8] data-[active=true]:bg-white/[0.08] data-[active=true]:text-[#d0d3d8] hover:bg-white/[0.06] hover:text-[#d0d3d8] h-9 text-sm';

  var PRIME_GPUS = "https://app.primeintellect.ai/dashboard/on-demand-gpus";
  // Frontier docs (match scraped dashboard deep-links per section).
  var ENV_DOCS = "https://olora.si/tutorials-environments/environments";
  var TRAIN_DOCS = "https://olora.si/hosted-training/getting-started";
  var STAR_KEY = "gd-starred-envs";
  var USER_ENV_KEY = "gd-user-envs";
  var DEPLOYMENTS_KEY = "gd-deployments";
  var API_KEYS_KEY = "gd-api-keys";
  var RUN_META_PREFIX = "gd-run-meta-";
  var ACCOUNT_KEY = "gd-account";

  function isDemoMode() {
    return true;
  }

  function seedDemoAccount() {
    try {
      if (!localStorage.getItem(ACCOUNT_KEY)) {
        localStorage.setItem(
          ACCOUNT_KEY,
          JSON.stringify({
            email: "demo@olora.si",
            name: "Demo Operator",
            wallet: "0x7a3f9c2e1b84d5a6e8f0123456789abcde91c91e",
            privyId: "demo",
            company: "Olora",
            bio: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
      if (!localStorage.getItem("gd-billing-plan")) {
        localStorage.setItem(
          "gd-billing-plan",
          JSON.stringify({
            id: "demo-pro",
            name: "Demo Pro",
            credits: 10000,
            status: "active",
            activatedAt: new Date().toISOString(),
          })
        );
      }
      if (!localStorage.getItem("gd-credits")) {
        localStorage.setItem("gd-credits", "10000");
      }
    } catch (e) {}
  }
  seedDemoAccount();

  var CREDITS_KEY = "gd-credits-balance";
  var CREDITED_RUNS_KEY = "gd-credited-runs";
  var BILLING_HISTORY_KEY = "gd-billing-history";
  var EVALS_KEY = "gd-evaluations";
  var TRAINING_KEY = "gd-training-runs";
  var DEPLOY_COST = 25;
  var EVAL_COST = 5;
  var MIN_BUDGET_CREDIT = 25;

  var FALLBACK_ENVS = [
  {
    id: "env-math-gsm8k-arithmetic",
    slug: "gsm8k-arithmetic",
    name: "GSM8K Arithmetic",
    description: "Grade-school word problems with multi-step arithmetic.",
    category: "Math",
    taskCount: 71,
    rewardType: "Correct Answer",
    exampleTask: "A store sells 3 packs of 12 pencils. How many pencils total?",
    exampleAnswer: "36",
    author: "alex-chen",
    stars: 24,
    difficulty: "Intermediate",
    updatedAt: "2026-01-08",
    tags: [
      "math",
      "gsm8k",
      "word-problems"
    ],
    usageCount: 16
  },
  {
    id: "env-math-contest-algebra",
    slug: "contest-algebra",
    name: "Contest Algebra",
    description: "AMC-style algebra and number theory puzzles.",
    category: "Math",
    taskCount: 26,
    rewardType: "Exact Match",
    exampleTask: "Solve for x: 2x + 5 = 17",
    exampleAnswer: "6",
    author: "rl-labs",
    stars: 36,
    difficulty: "Intermediate",
    updatedAt: "2026-05-04",
    tags: [
      "math",
      "algebra",
      "contest"
    ],
    usageCount: 20
  },
  {
    id: "env-math-fraction-mastery",
    slug: "fraction-mastery",
    name: "Fraction Mastery",
    description: "Add, subtract, and compare rational numbers.",
    category: "Math",
    taskCount: 84,
    rewardType: "Correct Answer",
    exampleTask: "What is 3/4 + 2/3 in lowest terms?",
    exampleAnswer: "17/12",
    author: "openenv",
    stars: 38,
    difficulty: "Intermediate",
    updatedAt: "2026-03-26",
    tags: [
      "math",
      "fractions",
      "rational"
    ],
    usageCount: 71
  },
  {
    id: "env-math-geometry-proofs-lite",
    slug: "geometry-proofs-lite",
    name: "Geometry Proofs Lite",
    description: "Short Euclidean geometry with angle and area reasoning.",
    category: "Math",
    taskCount: 20,
    rewardType: "Correct Answer",
    exampleTask: "Find the interior angle of a regular pentagon.",
    exampleAnswer: "108",
    author: "maria-kim",
    stars: 21,
    difficulty: "Beginner",
    updatedAt: "2026-07-06",
    tags: [
      "math",
      "geometry",
      "proofs"
    ],
    usageCount: 52
  },
  {
    id: "env-math-math-dataset-bench",
    slug: "math-dataset-bench",
    name: "MATH Dataset Bench",
    description: "Competition math from algebra through precalculus.",
    category: "Math",
    taskCount: 33,
    rewardType: "Exact Match",
    exampleTask: "Evaluate log base 2 of 64.",
    exampleAnswer: "6",
    author: "dev-eval",
    stars: 27,
    difficulty: "Advanced",
    updatedAt: "2026-05-16",
    tags: [
      "math",
      "competition",
      "precalc"
    ],
    usageCount: 35
  },
  {
    id: "env-math-numeric-word-problems",
    slug: "numeric-word-problems",
    name: "Numeric Word Problems",
    description: "Extract quantities and compute final answers from prose.",
    category: "Math",
    taskCount: 94,
    rewardType: "Correct Answer",
    exampleTask: "Train A leaves at 9am at 60 mph. When does it reach 180 miles?",
    exampleAnswer: "12:00 PM",
    author: "synth-bench",
    stars: 15,
    difficulty: "Advanced",
    updatedAt: "2026-01-14",
    tags: [
      "math",
      "word-problems",
      "reasoning"
    ],
    usageCount: 32
  },
  {
    id: "env-math-mental-math-sprint",
    slug: "mental-math-sprint",
    name: "Mental Math Sprint",
    description: "Fast arithmetic chains without calculator tools.",
    category: "Math",
    taskCount: 14,
    rewardType: "Correct Answer",
    exampleTask: "Compute 15 × 17 + 8",
    exampleAnswer: "263",
    author: "nora-patel",
    stars: 27,
    difficulty: "Intermediate",
    updatedAt: "2026-07-14",
    tags: [
      "math",
      "arithmetic",
      "speed"
    ],
    usageCount: 54
  },
  {
    id: "env-math-probability-basics",
    slug: "probability-basics",
    name: "Probability Basics",
    description: "Coins, dice, and simple conditional probability.",
    category: "Math",
    taskCount: 91,
    rewardType: "Correct Answer",
    exampleTask: "P(at least one head in two fair coin flips)?",
    exampleAnswer: "3/4",
    author: "agentforge",
    stars: 4,
    difficulty: "Intermediate",
    updatedAt: "2026-01-31",
    tags: [
      "math",
      "probability",
      "stats"
    ],
    usageCount: 59
  },
  {
    id: "env-math-linear-equations",
    slug: "linear-equations",
    name: "Linear Equations",
    description: "Systems of linear equations and inequalities.",
    category: "Math",
    taskCount: 59,
    rewardType: "Exact Match",
    exampleTask: "Solve: x + y = 10, x - y = 2",
    exampleAnswer: "x=6, y=4",
    author: "codecraft-io",
    stars: 9,
    difficulty: "Intermediate",
    updatedAt: "2026-01-12",
    tags: [
      "math",
      "linear",
      "systems"
    ],
    usageCount: 29
  },
  {
    id: "env-math-unit-conversion-math",
    slug: "unit-conversion-math",
    name: "Unit Conversion Math",
    description: "Convert between metric and imperial with word context.",
    category: "Math",
    taskCount: 28,
    rewardType: "Correct Answer",
    exampleTask: "How many cm in 2.5 meters?",
    exampleAnswer: "250",
    author: "theorem-lab",
    stars: 15,
    difficulty: "Beginner",
    updatedAt: "2026-03-07",
    tags: [
      "math",
      "units",
      "conversion"
    ],
    usageCount: 63
  },
  {
    id: "env-math-prime-factorization",
    slug: "prime-factorization",
    name: "Prime Factorization",
    description: "Factor integers and compute GCD/LCM.",
    category: "Math",
    taskCount: 47,
    rewardType: "Exact Match",
    exampleTask: "Prime factorization of 360",
    exampleAnswer: "2³ × 3² × 5",
    author: "jordan-lee",
    stars: 28,
    difficulty: "Beginner",
    updatedAt: "2026-08-01",
    tags: [
      "math",
      "number-theory",
      "factors"
    ],
    usageCount: 67
  },
  {
    id: "env-math-calculus-derivatives",
    slug: "calculus-derivatives",
    name: "Calculus Derivatives",
    description: "Symbolic differentiation of polynomials and trig.",
    category: "Math",
    taskCount: 79,
    rewardType: "Exact Match",
    exampleTask: "Derivative of x³ + 2x",
    exampleAnswer: "3x² + 2",
    author: "eval-hub",
    stars: 14,
    difficulty: "Beginner",
    updatedAt: "2026-08-16",
    tags: [
      "math",
      "calculus",
      "derivatives"
    ],
    usageCount: 42
  },
  {
    id: "env-code-python-bug-hunt",
    slug: "python-bug-hunt",
    name: "Python Bug Hunt",
    description: "Find and fix subtle bugs in Python functions.",
    category: "Code",
    taskCount: 37,
    rewardType: "Unit Tests Pass",
    exampleTask: "Fix IndexError in list comprehension filter",
    exampleAnswer: "bounds check before access",
    author: "priya-sharma",
    stars: 28,
    difficulty: "Advanced",
    updatedAt: "2026-02-15",
    tags: [
      "code",
      "python",
      "debugging"
    ],
    usageCount: 45
  },
  {
    id: "env-code-javascript-fix-it",
    slug: "javascript-fix-it",
    name: "JavaScript Fix-it",
    description: "Repair broken JS/TS snippets for passing tests.",
    category: "Code",
    taskCount: 32,
    rewardType: "Unit Tests Pass",
    exampleTask: "Fix async/await missing await on fetch",
    exampleAnswer: "await response.json()",
    author: "toolbench",
    stars: 3,
    difficulty: "Beginner",
    updatedAt: "2026-03-25",
    tags: [
      "code",
      "javascript",
      "async"
    ],
    usageCount: 5
  },
  {
    id: "env-code-algorithm-repair",
    slug: "algorithm-repair",
    name: "Algorithm Repair",
    description: "Correct off-by-one and logic errors in classic algorithms.",
    category: "Code",
    taskCount: 85,
    rewardType: "Unit Tests Pass",
    exampleTask: "Fix binary search mid calculation",
    exampleAnswer: "mid = lo + (hi - lo) // 2",
    author: "reasoning-co",
    stars: 36,
    difficulty: "Advanced",
    updatedAt: "2026-07-09",
    tags: [
      "code",
      "algorithms",
      "debugging"
    ],
    usageCount: 18
  },
  {
    id: "env-code-sql-query-fix",
    slug: "sql-query-fix",
    name: "SQL Query Fix",
    description: "Rewrite queries to match expected result sets.",
    category: "Code",
    taskCount: 62,
    rewardType: "Query Output Match",
    exampleTask: "Fix JOIN that drops null foreign keys",
    exampleAnswer: "LEFT JOIN instead of INNER",
    author: "sam-ortiz",
    stars: 11,
    difficulty: "Intermediate",
    updatedAt: "2026-02-11",
    tags: [
      "code",
      "sql",
      "databases"
    ],
    usageCount: 68
  },
  {
    id: "env-code-regex-rewrite",
    slug: "regex-rewrite",
    name: "Regex Rewrite",
    description: "Craft patterns that pass hidden string-matching tests.",
    category: "Code",
    taskCount: 67,
    rewardType: "Pattern Match",
    exampleTask: "Match valid IPv4 addresses",
    exampleAnswer: "^(\\d{1,3}\\.){3}\\d{1,3}$",
    author: "gradient-ops",
    stars: 26,
    difficulty: "Intermediate",
    updatedAt: "2026-05-13",
    tags: [
      "code",
      "regex",
      "strings"
    ],
    usageCount: 55
  },
  {
    id: "env-code-type-error-clinic",
    slug: "type-error-clinic",
    name: "Type Error Clinic",
    description: "Resolve TypeScript type errors in small modules.",
    category: "Code",
    taskCount: 59,
    rewardType: "Typecheck Pass",
    exampleTask: "Fix generic constraint on map callback",
    exampleAnswer: "extends keyof T",
    author: "mathbench",
    stars: 13,
    difficulty: "Advanced",
    updatedAt: "2026-08-17",
    tags: [
      "code",
      "typescript",
      "types"
    ],
    usageCount: 49
  },
  {
    id: "env-code-leetcode-lite",
    slug: "leetcode-lite",
    name: "LeetCode Lite",
    description: "Implement optimal solutions for array and string tasks.",
    category: "Code",
    taskCount: 66,
    rewardType: "Unit Tests Pass",
    exampleTask: "Two-sum with O(n) time",
    exampleAnswer: "hash map lookup",
    author: "swe-research",
    stars: 22,
    difficulty: "Intermediate",
    updatedAt: "2026-01-01",
    tags: [
      "code",
      "leetcode",
      "interview"
    ],
    usageCount: 71
  },
  {
    id: "env-code-api-handler-patch",
    slug: "api-handler-patch",
    name: "API Handler Patch",
    description: "Fix REST handlers for correct status codes and payloads.",
    category: "Code",
    taskCount: 20,
    rewardType: "Integration Tests Pass",
    exampleTask: "Return 404 when resource missing",
    exampleAnswer: "check exists before update",
    author: "citekit",
    stars: 6,
    difficulty: "Intermediate",
    updatedAt: "2026-05-29",
    tags: [
      "code",
      "api",
      "backend"
    ],
    usageCount: 19
  },
  {
    id: "env-code-memory-leak-fix",
    slug: "memory-leak-fix",
    name: "Memory Leak Fix",
    description: "Close resources and clear listeners in Node snippets.",
    category: "Code",
    taskCount: 68,
    rewardType: "Unit Tests Pass",
    exampleTask: "Remove event listener on component unmount",
    exampleAnswer: "return cleanup in useEffect",
    author: "lucas-nguyen",
    stars: 35,
    difficulty: "Advanced",
    updatedAt: "2026-01-16",
    tags: [
      "code",
      "node",
      "memory"
    ],
    usageCount: 73
  },
  {
    id: "env-code-concurrency-bug",
    slug: "concurrency-bug",
    name: "Concurrency Bug",
    description: "Fix race conditions in async Python code.",
    category: "Code",
    taskCount: 65,
    rewardType: "Unit Tests Pass",
    exampleTask: "Serialize access to shared counter",
    exampleAnswer: "asyncio.Lock around increment",
    author: "env-studio",
    stars: 28,
    difficulty: "Beginner",
    updatedAt: "2026-05-30",
    tags: [
      "code",
      "async",
      "concurrency"
    ],
    usageCount: 27
  },
  {
    id: "env-code-test-coverage-gap",
    slug: "test-coverage-gap",
    name: "Test Coverage Gap",
    description: "Add missing edge-case tests and minimal fixes.",
    category: "Code",
    taskCount: 85,
    rewardType: "Coverage + Tests Pass",
    exampleTask: "Handle empty input in parser",
    exampleAnswer: "early return []",
    author: "hop-qa",
    stars: 7,
    difficulty: "Beginner",
    updatedAt: "2026-02-06",
    tags: [
      "code",
      "testing",
      "tdd"
    ],
    usageCount: 73
  },
  {
    id: "env-software-engineering-swe-bench-lite",
    slug: "swe-bench-lite",
    name: "SWE-bench Lite",
    description: "Minimal repo patches that make failing tests pass.",
    category: "Software Engineering",
    taskCount: 72,
    rewardType: "Tests + Diff Quality",
    exampleTask: "Fix datetime timezone handling in utils",
    exampleAnswer: "use timezone-aware constructor",
    author: "debug-dojo",
    stars: 26,
    difficulty: "Advanced",
    updatedAt: "2026-05-13",
    tags: [
      "swe",
      "repos",
      "patches"
    ],
    usageCount: 17
  },
  {
    id: "env-software-engineering-issue-resolver",
    slug: "issue-resolver",
    name: "Issue Resolver",
    description: "Implement GitHub issue fixes in small open-source repos.",
    category: "Software Engineering",
    taskCount: 95,
    rewardType: "CI Green",
    exampleTask: "Close #142: null guard on config load",
    exampleAnswer: "default empty object",
    author: "tensor-play",
    stars: 14,
    difficulty: "Beginner",
    updatedAt: "2026-03-20",
    tags: [
      "swe",
      "github",
      "issues"
    ],
    usageCount: 36
  },
  {
    id: "env-software-engineering-refactor-safe",
    slug: "refactor-safe",
    name: "Refactor Safe",
    description: "Restructure code without changing external behavior.",
    category: "Software Engineering",
    taskCount: 96,
    rewardType: "Tests Pass + Lint",
    exampleTask: "Extract duplicate validation into helper",
    exampleAnswer: "shared validateInput()",
    author: "maya-foster",
    stars: 23,
    difficulty: "Intermediate",
    updatedAt: "2026-01-14",
    tags: [
      "swe",
      "refactor",
      "clean-code"
    ],
    usageCount: 62
  },
  {
    id: "env-software-engineering-dependency-bump",
    slug: "dependency-bump",
    name: "Dependency Bump",
    description: "Upgrade packages and fix breaking API changes.",
    category: "Software Engineering",
    taskCount: 60,
    rewardType: "Build + Tests Pass",
    exampleTask: "Migrate axios 0.x to 1.x interceptors",
    exampleAnswer: "update interceptor signature",
    author: "repo-gym",
    stars: 4,
    difficulty: "Beginner",
    updatedAt: "2026-01-02",
    tags: [
      "swe",
      "dependencies",
      "migration"
    ],
    usageCount: 64
  },
  {
    id: "env-software-engineering-config-fix",
    slug: "config-fix",
    name: "Config Fix",
    description: "Repair CI/CD and build configs for green pipelines.",
    category: "Software Engineering",
    taskCount: 54,
    rewardType: "CI Green",
    exampleTask: "Fix GitHub Actions Node version matrix",
    exampleAnswer: "node-version: [18, 20]",
    author: "search-agent",
    stars: 17,
    difficulty: "Intermediate",
    updatedAt: "2026-01-11",
    tags: [
      "swe",
      "ci",
      "devops"
    ],
    usageCount: 13
  },
  {
    id: "env-software-engineering-docstring-duty",
    slug: "docstring-duty",
    name: "Docstring Duty",
    description: "Add docs and type hints while preserving behavior.",
    category: "Software Engineering",
    taskCount: 39,
    rewardType: "Tests + Doc Lint",
    exampleTask: "Document public API with examples",
    exampleAnswer: "Google-style docstrings",
    author: "calc-tools",
    stars: 10,
    difficulty: "Advanced",
    updatedAt: "2026-04-20",
    tags: [
      "swe",
      "docs",
      "python"
    ],
    usageCount: 56
  },
  {
    id: "env-software-engineering-merge-conflict-resolver",
    slug: "merge-conflict-resolver",
    name: "Merge Conflict Resolver",
    description: "Resolve conflicts and keep tests passing.",
    category: "Software Engineering",
    taskCount: 76,
    rewardType: "Tests Pass",
    exampleTask: "Merge feature branch into main cleanly",
    exampleAnswer: "keep both imports, dedupe logic",
    author: "logic-lattice",
    stars: 3,
    difficulty: "Beginner",
    updatedAt: "2026-04-02",
    tags: [
      "swe",
      "git",
      "merge"
    ],
    usageCount: 62
  },
  {
    id: "env-software-engineering-feature-flag-wiring",
    slug: "feature-flag-wiring",
    name: "Feature Flag Wiring",
    description: "Gate new behavior behind flags with fallback paths.",
    category: "Software Engineering",
    taskCount: 55,
    rewardType: "Tests Pass",
    exampleTask: "Add USE_NEW_PARSER flag with legacy path",
    exampleAnswer: "if/else on env var",
    author: "kai-watanabe",
    stars: 22,
    difficulty: "Advanced",
    updatedAt: "2026-04-16",
    tags: [
      "swe",
      "feature-flags",
      "backend"
    ],
    usageCount: 4
  },
  {
    id: "env-software-engineering-hotfix-patch",
    slug: "hotfix-patch",
    name: "Hotfix Patch",
    description: "Minimal production fixes under time pressure.",
    category: "Software Engineering",
    taskCount: 15,
    rewardType: "Regression Tests Pass",
    exampleTask: "Patch SQL injection in search endpoint",
    exampleAnswer: "parameterized query",
    author: "patchworks",
    stars: 35,
    difficulty: "Intermediate",
    updatedAt: "2026-05-10",
    tags: [
      "swe",
      "security",
      "hotfix"
    ],
    usageCount: 66
  },
  {
    id: "env-software-engineering-monorepo-navigate",
    slug: "monorepo-navigate",
    name: "Monorepo Navigate",
    description: "Cross-package changes with workspace-aware builds.",
    category: "Software Engineering",
    taskCount: 67,
    rewardType: "Build + Tests Pass",
    exampleTask: "Update shared types used by 3 packages",
    exampleAnswer: "publish types package first",
    author: "gsm-pro",
    stars: 37,
    difficulty: "Intermediate",
    updatedAt: "2026-04-01",
    tags: [
      "swe",
      "monorepo",
      "typescript"
    ],
    usageCount: 54
  },
  {
    id: "env-reasoning-multi-hop-qa",
    slug: "multi-hop-qa",
    name: "Multi-hop QA",
    description: "Chain facts across short passages to answer questions.",
    category: "Reasoning",
    taskCount: 19,
    rewardType: "Exact Match",
    exampleTask: "Who co-founded the lab that published paper X?",
    exampleAnswer: "Named entity match",
    author: "trajectory-ai",
    stars: 22,
    difficulty: "Advanced",
    updatedAt: "2026-07-27",
    tags: [
      "reasoning",
      "multi-hop",
      "qa"
    ],
    usageCount: 22
  },
  {
    id: "env-reasoning-logic-grid-puzzles",
    slug: "logic-grid-puzzles",
    name: "Logic Grid Puzzles",
    description: "Deduce assignments from constraint clues.",
    category: "Reasoning",
    taskCount: 64,
    rewardType: "Exact Match",
    exampleTask: "Which person owns the cat?",
    exampleAnswer: "Alice",
    author: "emma-clark",
    stars: 22,
    difficulty: "Advanced",
    updatedAt: "2026-03-14",
    tags: [
      "reasoning",
      "logic",
      "puzzles"
    ],
    usageCount: 45
  },
  {
    id: "env-reasoning-causal-inference",
    slug: "causal-inference",
    name: "Causal Inference",
    description: "Identify cause vs correlation in scenario text.",
    category: "Reasoning",
    taskCount: 26,
    rewardType: "Multiple Choice",
    exampleTask: "Did rainfall cause the crop yield increase?",
    exampleAnswer: "No — irrigation was added",
    author: "prime-eval",
    stars: 4,
    difficulty: "Beginner",
    updatedAt: "2026-03-16",
    tags: [
      "reasoning",
      "causal",
      "nlp"
    ],
    usageCount: 52
  },
  {
    id: "env-reasoning-analogy-completion",
    slug: "analogy-completion",
    name: "Analogy Completion",
    description: "Finish word analogies with semantic consistency.",
    category: "Reasoning",
    taskCount: 30,
    rewardType: "Exact Match",
    exampleTask: "hot : cold :: up : ?",
    exampleAnswer: "down",
    author: "algebra-bot",
    stars: 14,
    difficulty: "Intermediate",
    updatedAt: "2026-01-18",
    tags: [
      "reasoning",
      "analogy",
      "language"
    ],
    usageCount: 42
  },
  {
    id: "env-reasoning-table-reasoning",
    slug: "table-reasoning",
    name: "Table Reasoning",
    description: "Answer questions over structured tables and charts.",
    category: "Reasoning",
    taskCount: 90,
    rewardType: "Exact Match",
    exampleTask: "Which quarter had highest revenue growth?",
    exampleAnswer: "Q3",
    author: "api-orchestra",
    stars: 27,
    difficulty: "Advanced",
    updatedAt: "2026-06-11",
    tags: [
      "reasoning",
      "tables",
      "data"
    ],
    usageCount: 8
  },
  {
    id: "env-reasoning-temporal-ordering",
    slug: "temporal-ordering",
    name: "Temporal Ordering",
    description: "Sort events into correct chronological order.",
    category: "Reasoning",
    taskCount: 66,
    rewardType: "Exact Sequence",
    exampleTask: "Order: treaty signed, war declared, peace talks",
    exampleAnswer: "war → treaty → talks",
    author: "chain-of-thought",
    stars: 24,
    difficulty: "Advanced",
    updatedAt: "2026-06-22",
    tags: [
      "reasoning",
      "temporal",
      "events"
    ],
    usageCount: 32
  },
  {
    id: "env-reasoning-counterfactual-reason",
    slug: "counterfactual-reason",
    name: "Counterfactual Reason",
    description: "Predict outcomes under hypothetical changes.",
    category: "Reasoning",
    taskCount: 33,
    rewardType: "Exact Match",
    exampleTask: "If price doubled, demand would…",
    exampleAnswer: "decrease per supply-demand",
    author: "oliver-banks",
    stars: 5,
    difficulty: "Intermediate",
    updatedAt: "2026-03-08",
    tags: [
      "reasoning",
      "counterfactual",
      "economics"
    ],
    usageCount: 75
  },
  {
    id: "env-reasoning-syllogism-validator",
    slug: "syllogism-validator",
    name: "Syllogism Validator",
    description: "Judge validity of deductive argument forms.",
    category: "Reasoning",
    taskCount: 62,
    rewardType: "Valid / Invalid",
    exampleTask: "All A are B. All B are C. Therefore?",
    exampleAnswer: "Valid: All A are C",
    author: "unit-test-lab",
    stars: 33,
    difficulty: "Advanced",
    updatedAt: "2026-04-01",
    tags: [
      "reasoning",
      "logic",
      "deduction"
    ],
    usageCount: 10
  },
  {
    id: "env-reasoning-commonsense-qa",
    slug: "commonsense-qa",
    name: "Commonsense QA",
    description: "Everyday physical and social reasoning questions.",
    category: "Reasoning",
    taskCount: 94,
    rewardType: "Exact Match",
    exampleTask: "Why would wet pavement be slippery?",
    exampleAnswer: "reduced friction",
    author: "web-retrieval",
    stars: 23,
    difficulty: "Advanced",
    updatedAt: "2026-07-30",
    tags: [
      "reasoning",
      "commonsense",
      "physical"
    ],
    usageCount: 25
  },
  {
    id: "env-search-search-and-cite",
    slug: "search-and-cite",
    name: "Search & Cite",
    description: "Use search tools, answer questions, and cite sources.",
    category: "Search",
    taskCount: 79,
    rewardType: "Answer + Citation",
    exampleTask: "When was the Transformer paper published?",
    exampleAnswer: "2017 (Attention Is All You Need)",
    author: "function-caller",
    stars: 22,
    difficulty: "Intermediate",
    updatedAt: "2026-08-16",
    tags: [
      "search",
      "citation",
      "tools"
    ],
    usageCount: 23
  },
  {
    id: "env-search-fact-verification",
    slug: "fact-verification",
    name: "Fact Verification",
    description: "Verify claims against retrieved web snippets.",
    category: "Search",
    taskCount: 15,
    rewardType: "Supported / Refuted",
    exampleTask: "Did Company X acquire Y in 2024?",
    exampleAnswer: "Refuted — deal fell through",
    author: "contest-math",
    stars: 13,
    difficulty: "Intermediate",
    updatedAt: "2026-03-18",
    tags: [
      "search",
      "fact-check",
      "verification"
    ],
    usageCount: 30
  },
  {
    id: "env-search-fresh-news-qa",
    slug: "fresh-news-qa",
    name: "Fresh News QA",
    description: "Answer time-sensitive questions with recent sources.",
    category: "Search",
    taskCount: 67,
    rewardType: "Answer + Citation",
    exampleTask: "Latest Fed interest rate decision?",
    exampleAnswer: "held at 5.25% (source: …)",
    author: "refactor-radar",
    stars: 18,
    difficulty: "Intermediate",
    updatedAt: "2026-08-06",
    tags: [
      "search",
      "news",
      "current"
    ],
    usageCount: 74
  },
  {
    id: "env-search-academic-lookup",
    slug: "academic-lookup",
    name: "Academic Lookup",
    description: "Find papers, authors, and citation counts.",
    category: "Search",
    taskCount: 15,
    rewardType: "Exact Match + DOI",
    exampleTask: "First author of BERT paper?",
    exampleAnswer: "Jacob Devlin",
    author: "zara-hussain",
    stars: 25,
    difficulty: "Beginner",
    updatedAt: "2026-03-22",
    tags: [
      "search",
      "academic",
      "papers"
    ],
    usageCount: 17
  },
  {
    id: "env-search-product-compare",
    slug: "product-compare",
    name: "Product Compare",
    description: "Compare specs from multiple search results.",
    category: "Search",
    taskCount: 29,
    rewardType: "Structured Answer",
    exampleTask: "Which GPU has more VRAM: A or B?",
    exampleAnswer: "B — 24GB vs 16GB",
    author: "deduction-deck",
    stars: 20,
    difficulty: "Beginner",
    updatedAt: "2026-04-19",
    tags: [
      "search",
      "comparison",
      "products"
    ],
    usageCount: 35
  },
  {
    id: "env-search-local-business-finder",
    slug: "local-business-finder",
    name: "Local Business Finder",
    description: "Locate businesses matching constraints in a city.",
    category: "Search",
    taskCount: 53,
    rewardType: "Exact Match",
    exampleTask: "24h pharmacy near downtown Austin",
    exampleAnswer: "Named business + address",
    author: "browse-bench",
    stars: 38,
    difficulty: "Beginner",
    updatedAt: "2026-05-02",
    tags: [
      "search",
      "local",
      "geo"
    ],
    usageCount: 13
  },
  {
    id: "env-search-regulation-lookup",
    slug: "regulation-lookup",
    name: "Regulation Lookup",
    description: "Find relevant regulations and summarize requirements.",
    category: "Search",
    taskCount: 18,
    rewardType: "Answer + Citation",
    exampleTask: "GDPR data retention minimum rules?",
    exampleAnswer: "Summary with Article 5 cite",
    author: "multi-tool",
    stars: 18,
    difficulty: "Beginner",
    updatedAt: "2026-08-13",
    tags: [
      "search",
      "legal",
      "compliance"
    ],
    usageCount: 28
  },
  {
    id: "env-search-code-search-qa",
    slug: "code-search-qa",
    name: "Code Search QA",
    description: "Search docs and repos to answer implementation questions.",
    category: "Search",
    taskCount: 61,
    rewardType: "Answer + Link",
    exampleTask: "How to enable streaming in OpenAI SDK?",
    exampleAnswer: "stream=True parameter",
    author: "proof-pilot",
    stars: 6,
    difficulty: "Advanced",
    updatedAt: "2026-03-28",
    tags: [
      "search",
      "code",
      "docs"
    ],
    usageCount: 13
  },
  {
    id: "env-search-multi-source-synthesis",
    slug: "multi-source-synthesis",
    name: "Multi-source Synthesis",
    description: "Combine 3+ sources into a coherent summary.",
    category: "Search",
    taskCount: 86,
    rewardType: "Answer + Citations",
    exampleTask: "Summarize pros/cons of RAG vs fine-tuning",
    exampleAnswer: "Balanced summary with 3 cites",
    author: "issue-tracker",
    stars: 6,
    difficulty: "Intermediate",
    updatedAt: "2026-01-12",
    tags: [
      "search",
      "synthesis",
      "rag"
    ],
    usageCount: 55
  },
  {
    id: "env-tool-use-calculator-chain",
    slug: "calculator-chain",
    name: "Calculator Chain",
    description: "Call calculators and unit converters in sequence.",
    category: "Tool Use",
    taskCount: 73,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Convert 72°F to °C then round",
    exampleAnswer: "22",
    author: "fact-finder",
    stars: 25,
    difficulty: "Intermediate",
    updatedAt: "2026-03-09",
    tags: [
      "tools",
      "calculator",
      "trajectory"
    ],
    usageCount: 77
  },
  {
    id: "env-tool-use-api-orchestration",
    slug: "api-orchestration",
    name: "API Orchestration",
    description: "Call REST APIs in the correct order with auth.",
    category: "Tool Use",
    taskCount: 81,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Create user then assign role via API",
    exampleAnswer: "POST /users → POST /roles/assign",
    author: "workflow-env",
    stars: 21,
    difficulty: "Beginner",
    updatedAt: "2026-04-26",
    tags: [
      "tools",
      "api",
      "agents"
    ],
    usageCount: 39
  },
  {
    id: "env-tool-use-sql-agent",
    slug: "sql-agent",
    name: "SQL Agent",
    description: "Query databases via tool calls to answer questions.",
    category: "Tool Use",
    taskCount: 91,
    rewardType: "Query + Answer Match",
    exampleTask: "Top 5 customers by revenue last quarter",
    exampleAnswer: "SELECT … ORDER BY revenue DESC LIMIT 5",
    author: "numeric-nav",
    stars: 19,
    difficulty: "Advanced",
    updatedAt: "2026-05-30",
    tags: [
      "tools",
      "sql",
      "database"
    ],
    usageCount: 35
  },
  {
    id: "env-tool-use-file-system-agent",
    slug: "file-system-agent",
    name: "File System Agent",
    description: "Read, grep, and edit files through sandbox tools.",
    category: "Tool Use",
    taskCount: 49,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Find config key MAX_RETRIES in repo",
    exampleAnswer: "grep + read config.yaml",
    author: "merge-queue",
    stars: 10,
    difficulty: "Intermediate",
    updatedAt: "2026-01-14",
    tags: [
      "tools",
      "filesystem",
      "agents"
    ],
    usageCount: 24
  },
  {
    id: "env-tool-use-weather-workflow",
    slug: "weather-workflow",
    name: "Weather Workflow",
    description: "Geocode location then fetch forecast data.",
    category: "Tool Use",
    taskCount: 53,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Tomorrow's high in San Francisco?",
    exampleAnswer: "geocode → forecast → parse",
    author: "alex-chen",
    stars: 37,
    difficulty: "Intermediate",
    updatedAt: "2026-02-07",
    tags: [
      "tools",
      "weather",
      "workflow"
    ],
    usageCount: 74
  },
  {
    id: "env-tool-use-email-draft-agent",
    slug: "email-draft-agent",
    name: "Email Draft Agent",
    description: "Lookup contact info then compose formatted email.",
    category: "Tool Use",
    taskCount: 45,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Schedule meeting with project lead",
    exampleAnswer: "lookup contact → draft → send",
    author: "rl-labs",
    stars: 13,
    difficulty: "Advanced",
    updatedAt: "2026-07-24",
    tags: [
      "tools",
      "email",
      "workflow"
    ],
    usageCount: 23
  },
  {
    id: "env-tool-use-spreadsheet-tools",
    slug: "spreadsheet-tools",
    name: "Spreadsheet Tools",
    description: "Read cells, compute aggregates, write results back.",
    category: "Tool Use",
    taskCount: 51,
    rewardType: "Cell Value Match",
    exampleTask: "Sum column B for rows where A='Active'",
    exampleAnswer: "SUMIF formula or tool chain",
    author: "openenv",
    stars: 38,
    difficulty: "Intermediate",
    updatedAt: "2026-01-15",
    tags: [
      "tools",
      "spreadsheet",
      "data"
    ],
    usageCount: 19
  },
  {
    id: "env-tool-use-browser-automation-lite",
    slug: "browser-automation-lite",
    name: "Browser Automation Lite",
    description: "Navigate pages and extract structured data.",
    category: "Tool Use",
    taskCount: 90,
    rewardType: "Extracted Data Match",
    exampleTask: "Get price from product page",
    exampleAnswer: "navigate → select → parse price",
    author: "maria-kim",
    stars: 12,
    difficulty: "Intermediate",
    updatedAt: "2026-07-22",
    tags: [
      "tools",
      "browser",
      "scraping"
    ],
    usageCount: 40
  },
  {
    id: "env-tool-use-multi-tool-planning",
    slug: "multi-tool-planning",
    name: "Multi-tool Planning",
    description: "Plan and execute tool sequences for compound tasks.",
    category: "Tool Use",
    taskCount: 24,
    rewardType: "Correct Tool Trajectory",
    exampleTask: "Book flight + hotel under $800 total",
    exampleAnswer: "search flights → search hotels → compare",
    author: "dev-eval",
    stars: 5,
    difficulty: "Advanced",
    updatedAt: "2026-04-03",
    tags: [
      "tools",
      "planning",
      "agents"
    ],
    usageCount: 3
  }
];  var CATALOG_CACHE_KEY = "gd-catalog-envs-v2";

  function readCachedEnvs() {
    try {
      var raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
    return FALLBACK_ENVS.slice();
  }

  var state = {
    envs: readCachedEnvs(),
    models: [],
    currentRun: null,
    eventSource: null,
    envUi: {
      tab: "explore",
      search: "",
      category: "All",
      sort: "popular",
    },
  };

  function path() {
    return location.pathname.replace(/\/$/, "") || "/lab";
  }

  function pageKind() {
    var p = path();
    if (p.indexOf("/lab/dashboard/home/quickstart") === 0) return "quickstart";
    if (p === "/lab" || p === "/lab/home" || p.indexOf("/lab/home") === 0) return "home";
    if (p === "/lab/dashboard" || p.indexOf("/lab/dashboard/overview") === 0) return "dashboard";
    if (p.indexOf("/lab/models") === 0 || p.indexOf("/lab/inference") === 0) return "models";
    if (p.indexOf("/lab/compute") === 0 || p.indexOf("/lab/dashboard/on-demand-gpus") === 0)
      return "compute";
    if (p.indexOf("/lab/integrations") === 0) return "integrations";
    if (p.indexOf("/lab/deploy") === 0) return "deploy";
    if (p.indexOf("/lab/keys") === 0 || p.indexOf("/lab/dashboard/tokens") === 0) return "keys";
    if (p === "/lab/dashboard/home") return "home";
    if (p.indexOf("/lab/dashboard/environments") === 0) return "environments";
    if (p.indexOf("/lab/dashboard/evaluations") === 0) return "evaluations";
    if (p.indexOf("/lab/dashboard/training") === 0) return "training";
    if (p.indexOf("/lab/dashboard/instances") === 0) return "instances";
    if (p.indexOf("/lab/arena") === 0) return "arena";
    if (p.indexOf("/lab/leaderboard") === 0) return "leaderboard";
    if (p.indexOf("/lab/router") === 0) return "router";
    if (p.indexOf("/lab/dashboard/billing") === 0) return "billing";
    if (p.indexOf("/lab/dashboard/checkout") === 0) return "checkout";
    if (p.indexOf("/lab/dashboard/profile") === 0) return "profile";
    if (p.indexOf("/lab/dashboard/support") === 0) return "docs";
    if (p.indexOf("/lab/activity") === 0) return "activity";
    if (p.indexOf("/lab/network") === 0) return "compute";
    return "other";
  }

  function toast(msg) {
    var el = document.getElementById("gd-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gd-toast";
      el.className = "gd-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2800);
  }

  function ensureOverlay() {
    var root = document.getElementById("gd-overlay-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "gd-overlay-root";
    root.innerHTML =
      '<div class="gd-modal" role="dialog" aria-modal="true"><header><h2 id="gd-modal-title"></h2><button type="button" class="gd-close" aria-label="Close">&times;</button></header><div class="gd-body" id="gd-modal-body"></div></div>';
    document.body.appendChild(root);
    root.querySelector(".gd-close").addEventListener("click", closeModal);
    root.addEventListener("click", function (e) {
      if (e.target === root) closeModal();
    });
    return root;
  }

  function openModal(title, bodyHtml) {
    var root = ensureOverlay();
    root.querySelector("#gd-modal-title").textContent = title;
    root.querySelector("#gd-modal-body").innerHTML = bodyHtml;
    root.classList.add("gd-open");
  }

  function closeModal() {
    var root = document.getElementById("gd-overlay-root");
    if (root) root.classList.remove("gd-open");
    var modal = root && root.querySelector(".gd-modal");
    if (modal) modal.classList.remove("gd-modal-wide", "gd-modal-checkout", "gd-modal-gpu-checkout", "gd-modal-support", "gd-modal-wallet");
    if (!window.__gdCheckoutKeepPlan) {
      window.__gdCheckoutPendingPlan = null;
      window.__gdCheckoutPendingAmt = null;
    }
    window.__gdCheckoutKeepPlan = false;
  }

  /* ——— Account & billing (Lab credits sandbox; Inference is wallet-gated) ——— */

  function getAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveAccount(account) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    refreshSidebarAccount();
  }

  function isSignedIn() {
    var a = getAccount();
    return !!(a && (a.email || a.wallet));
  }

  function getActivePlan() {
    try {
      return JSON.parse(localStorage.getItem("gd-billing-plan") || "null");
    } catch (e) {
      return null;
    }
  }

  function hasActivePlan() {
    var plan = getActivePlan();
    return !!(plan && plan.id);
  }

  function getCredits() {
    try {
      return Number(localStorage.getItem(CREDITS_KEY) || "0");
    } catch (e) {
      return 0;
    }
  }

  function setCredits(amount) {
    var val = Math.max(0, Number(amount) || 0);
    localStorage.setItem(CREDITS_KEY, String(Number(val.toFixed(2))));
    refreshSidebarAccount();
    if (pageKind() === "billing") renderBillingPage();
    return val;
  }

  function getBillingHistory() {
    try {
      return JSON.parse(localStorage.getItem(BILLING_HISTORY_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function addBillingEntry(entry) {
    var list = getBillingHistory();
    list.unshift(
      Object.assign({ id: "bill-" + Date.now(), at: new Date().toISOString() }, entry)
    );
    localStorage.setItem(BILLING_HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
    if (pageKind() === "billing") renderBillingPage();
  }

  function getCreditedRuns() {
    try {
      return JSON.parse(localStorage.getItem(CREDITED_RUNS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function markRunCredited(runId) {
    var ids = getCreditedRuns();
    if (ids.indexOf(runId) < 0) {
      ids.push(runId);
      localStorage.setItem(CREDITED_RUNS_KEY, JSON.stringify(ids));
    }
  }

  function formatMoney(n) {
    return "$" + (Number(n) || 0).toFixed(2);
  }

  function addCredits(amount, label) {
    var next = setCredits(getCredits() + amount);
    addBillingEntry({
      type: "credit",
      amount: amount,
      label: label || "Credits added",
      balance: next,
    });
    return next;
  }

  function deductCredits(amount, label) {
    var bal = getCredits();
    if (bal < amount) return false;
    setCredits(bal - amount);
    addBillingEntry({
      type: "debit",
      amount: amount,
      label: label || "Usage",
      balance: getCredits(),
    });
    return true;
  }

  function canAfford(amount) {
    return getCredits() >= amount;
  }

  function trainingBudgetAllowed(maxBudget) {
    return Number(maxBudget) >= MIN_BUDGET_CREDIT;
  }

  function canStartTraining(maxBudget) {
    return canAfford(maxBudget) || trainingBudgetAllowed(maxBudget);
  }

  function accountInitials(email) {
    var parts = String(email || "")
      .split("@")[0]
      .split(/[._-]+/)
      .filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(email || "?").slice(0, 2).toUpperCase();
  }

  function refreshSidebarAccount() {
    var footer = document.querySelector('[data-sidebar="footer"]');
    if (!footer) return;

    var widget = document.getElementById("gd-sidebar-account");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "gd-sidebar-account";
      widget.className = "gd-sidebar-account";
      var menu = footer.querySelector('[data-sidebar="menu"]');
      if (menu) footer.insertBefore(widget, menu);
      else footer.insertBefore(widget, footer.firstChild);
    }

    var account = getAccount();
    var bal = getCredits();
    if (account && account.email) {
      widget.innerHTML =
        '<div class="gd-sidebar-user">' +
        '<div class="gd-sidebar-avatar" aria-hidden="true">' +
        escapeHtml(accountInitials(account.email)) +
        "</div>" +
        '<div class="gd-sidebar-user-meta">' +
        '<span class="gd-sidebar-user-name">' +
        escapeHtml(account.name || account.email.split("@")[0]) +
        "</span>" +
        '<span class="gd-sidebar-user-email">' +
        escapeHtml(account.email) +
        "</span></div></div>" +
        '<div class="gd-sidebar-balance-row">' +
        "<span>Balance</span>" +
        '<strong class="gd-sidebar-balance">' +
        formatMoney(bal) +
        "</strong></div>" +
        '<div class="gd-sidebar-account-actions">' +
        '<button type="button" class="gd-sidebar-btn" id="gd-add-credits-sidebar">Add credits</button>' +
        '<a class="gd-sidebar-link" href="/lab/dashboard/billing">Billing</a>' +
        '<button type="button" class="gd-sidebar-link gd-sidebar-link-btn" id="gd-sign-out">Sign out</button>' +
        "</div>";
      var addBtn = document.getElementById("gd-add-credits-sidebar");
      if (addBtn) addBtn.onclick = function () {
        window.__gdCheckoutPendingPlan = null;
        openAddCreditsCheckout();
      };
      var outBtn = document.getElementById("gd-sign-out");
      if (outBtn) {
        outBtn.onclick = function () {
          localStorage.removeItem(ACCOUNT_KEY);
          refreshSidebarAccount();
          refreshEnvPanelsIfNeeded();
          refreshEvaluationsIfNeeded();
          refreshTrainingIfNeeded();
          toast("Signed out");
        };
      }
    } else {
      widget.innerHTML =
        '<p class="gd-sidebar-guest">Sign in and choose a plan to create environments, run evaluations, and train.</p>' +
        '<p class="gd-sidebar-guest-hint">Billing unlocks Lab compute for Environments, Evaluations, and Training.</p>';
    }

    footer.querySelectorAll("button").forEach(function (btn) {
      var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (label !== "Sign In") return;
      btn.id = "gd-sign-in-btn";
      if (account && account.email) {
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          '<span class="group-data-[collapsible=icon]:hidden">' +
          escapeHtml(account.name || account.email.split("@")[0]) +
          "</span>";
      } else {
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>' +
          '<span class="group-data-[collapsible=icon]:hidden">Sign In</span>';
      }
    });
  }

  function wireAccount() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest && e.target.closest("#gd-sign-in-btn, [data-sidebar='footer'] button");
        if (!btn) return;
        var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (label === "Sign In" || btn.id === "gd-sign-in-btn") {
          if (isSignedIn()) {
            location.href = "/lab/dashboard/billing";
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          openSignInModal();
        }
      },
      true
    );
    refreshSidebarAccount();
  }

  function labSignInUrl() {
    var ret = encodeURIComponent(location.pathname + location.search);
    return "/lab/signin?return=" + ret;
  }

  function openSignInModal(onSuccess) {
    // Lab dashboard pages are static HTML; Privy lives on the Next.js sign-in route.
    // Persist a flag so gated actions can resume after returning from Privy.
    try {
      if (typeof onSuccess === "function") {
        sessionStorage.setItem("gd-pending-auth", "1");
      }
    } catch (e) {}
    location.href = labSignInUrl();
  }

  function openCreditsGateModal(amount, context, onSuccess) {
    var bal = getCredits();
    var needs = Math.max(0, amount - bal);
    openModal(
      "Credits required",
      '<div class="gd-gate-box">' +
        '<p class="gd-gate-lead">' +
        escapeHtml(context || "Compute usage requires a positive balance.") +
        "</p>" +
        '<div class="gd-gate-stats">' +
        '<div><span class="k">Your balance</span><span class="v">' +
        formatMoney(bal) +
        "</span></div>" +
        '<div><span class="k">Required</span><span class="v">' +
        formatMoney(amount) +
        "</span></div>" +
        '<div><span class="k">Shortfall</span><span class="v gd-gate-warn">' +
        formatMoney(needs) +
        "</span></div></div>" +
        (context && context.indexOf("training budget") >= 0
          ? '<p class="gd-gate-note">Demo tip: set max training budget to $25+ — unused budget credits your balance when training completes.</p>'
          : '<p class="gd-gate-note">Add credits to run evals, train on GPUs, or deploy to Inference.</p>') +
        '<div class="gd-actions" style="justify-content:flex-start;margin-top:1rem">' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-gate-cancel">Cancel</button>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-gate-add">Add credits</button>' +
        "</div></div>"
    );
    document.getElementById("gd-gate-cancel").onclick = closeModal;
    document.getElementById("gd-gate-add").onclick = function () {
      closeModal();
      openAddCreditsCheckout(onSuccess);
    };
  }

  function requireSignIn(onSuccess, message) {
    if (isSignedIn()) {
      if (typeof onSuccess === "function") onSuccess();
      return true;
    }
    openSignInModal(onSuccess);
    return false;
  }

  function openPlanGateModal(message, onSuccess) {
    openModal(
      "Plan required",
      '<p class="gd-gate-lead">' +
        escapeHtml(
          message ||
            "Choose a Pro or Premium plan to create environments, run evaluations, and start training."
        ) +
        "</p>" +
        '<p class="gd-gate-note">Plans include monthly compute credits for Lab workloads.</p>' +
        '<div class="gd-actions" style="justify-content:flex-start;margin-top:1rem">' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-plan-cancel">Cancel</button>' +
        '<a class="gd-btn gd-btn-primary" id="gd-plan-billing" href="/lab/dashboard/billing">View plans</a>' +
        "</div>"
    );
    document.getElementById("gd-plan-cancel").onclick = closeModal;
    var go = document.getElementById("gd-plan-billing");
    if (go) {
      go.onclick = function (e) {
        e.preventDefault();
        closeModal();
        if (typeof onSuccess === "function") {
          window.__gdPendingLabAction = onSuccess;
        }
        location.href = "/lab/dashboard/billing";
      };
    }
  }

  /** Sign in + active billing plan required for Environments / Evaluations / Training. */
  function requireLabAccess(onSuccess, message) {
    if (isDemoMode()) {
      seedDemoAccount();
      if (typeof onSuccess === "function") onSuccess();
      return true;
    }
    if (!isSignedIn()) {
      return requireSignIn(function () {
        requireLabAccess(onSuccess, message);
      }, message || "Sign in to use Environments, Evaluations, and Training.");
    }
    if (!hasActivePlan()) {
      openPlanGateModal(
        message ||
          "Purchase a plan to create environments, run evaluations, or start training.",
        onSuccess
      );
      return false;
    }
    if (typeof onSuccess === "function") onSuccess();
    return true;
  }

  function requireComputeCredits(amount, context, onSuccess) {
    if (isDemoMode()) {
      seedDemoAccount();
      if (typeof onSuccess === "function") onSuccess();
      return true;
    }
    if (!isSignedIn()) {
      return requireSignIn(function () {
        requireComputeCredits(amount, context, onSuccess);
      }, context);
    }
    if (!hasActivePlan()) {
      openPlanGateModal(
        "Purchase a plan before using compute for evaluations, training, or deploy.",
        function () {
          requireComputeCredits(amount, context, onSuccess);
        }
      );
      return false;
    }
    if (canAfford(amount)) {
      if (typeof onSuccess === "function") onSuccess();
      return true;
    }
    openCreditsGateModal(amount, context, onSuccess);
    return false;
  }

  function checkoutRef() {
    return (
      "pi_" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function renderCapacityFail(root, kind) {
    if (!root) return;
    window.__gdCheckoutPendingAmt = null;
    window.__gdCheckoutPendingPlan = null;
    var gpu = kind === "gpu";
    var title = gpu
      ? "Couldn't provision this instance"
      : "Couldn't activate this plan";
    var lead = gpu
      ? "All reserved GPU capacity in this region is currently allocated. We're expanding the cluster and expect additional H100 / A100 nodes as soon as they come online."
      : "New Lab subscriptions are paused while we expand GPU capacity. Additional clusters are coming online as fast as we can provision them.";
    var code = gpu ? "gpu_capacity_unavailable" : "billing_capacity_hold";
    var ref = checkoutRef();
    root.innerHTML =
      '<div class="gd-checkout-failed">' +
      '<div class="gd-checkout-fail-icon" aria-hidden="true">!</div>' +
      "<h3>" +
      title +
      "</h3>" +
      "<p>" +
      lead +
      "</p>" +
      '<p class="gd-checkout-sub">Your card was authorized, then released. You were not charged.</p>' +
      '<dl class="gd-checkout-fail-meta">' +
      "<div><dt>Status</dt><dd>capacity_unavailable</dd></div>" +
      "<div><dt>Code</dt><dd>" +
      code +
      "</dd></div>" +
      "<div><dt>Payment</dt><dd>" +
      escapeHtml(ref) +
      "</dd></div>" +
      "</dl>" +
      '<div class="gd-actions" style="justify-content:center;margin-top:1.1rem">' +
      (gpu
        ? '<a class="gd-btn gd-btn-ghost" href="/lab/dashboard/on-demand-gpus">Choose another offer</a>'
        : "") +
      '<button type="button" class="gd-btn gd-btn-primary" id="gd-checkout-close">Close</button>' +
      "</div></div>";
    var close = document.getElementById("gd-checkout-close");
    if (close) {
      close.onclick = function () {
        if (gpu) {
          location.href = "/lab/dashboard/on-demand-gpus";
          return;
        }
        closeModal();
      };
    }
    toast(gpu ? "GPU pool at capacity — not charged" : "Plan on hold — not charged");
  }

  function runCheckoutProcessing(root, steps, onDone) {
    root.innerHTML =
      '<div class="gd-checkout-processing">' +
      '<div class="gd-checkout-spinner" aria-hidden="true"></div>' +
      '<p class="gd-checkout-status" id="gd-checkout-status">' +
      steps[0] +
      "</p>" +
      '<p class="gd-checkout-sub">Do not close this window.</p></div>';
    var si = 0;
    var tick = setInterval(function () {
      si += 1;
      if (si < steps.length) {
        var st = document.getElementById("gd-checkout-status");
        if (st) st.textContent = steps[si];
      }
    }, 700);
    setTimeout(function () {
      clearInterval(tick);
      onDone();
    }, steps.length * 700 + 400);
  }

  function openAddCreditsCheckout(onSuccess) {
    if (!isSignedIn()) {
      openSignInModal(function () {
        openAddCreditsCheckout(onSuccess);
      });
      return;
    }
    if (!window.__gdCheckoutPendingPlan) {
      window.__gdCheckoutPendingPlan = null;
    }
    openModal(
      window.__gdCheckoutPendingPlan
        ? "Checkout · " + window.__gdCheckoutPendingPlan.name
        : "Add credits",
      '<div class="gd-checkout" id="gd-checkout-root">' +
        '<div class="gd-checkout-summary">' +
        '<span class="gd-checkout-brand">Olora Cloud</span>' +
        '<p class="gd-checkout-sub">Lab credits · sandbox billing</p></div>' +
        '<div class="gd-field"><label class="gd-label">Amount (USD)</label>' +
        '<div class="gd-checkout-amounts">' +
        ['25', '50', '100']
          .map(function (a, i) {
            return (
              '<button type="button" class="gd-checkout-amt' +
              (i === 0 ? " active" : "") +
              '" data-amt="' +
              a +
              '">$' +
              a +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<input class="gd-input gd-checkout-custom" id="gd-checkout-amount" type="number" min="5" step="1" value="25"/></div>' +
        '<div class="gd-checkout-card">' +
        '<div class="gd-checkout-card-head"><span>Card</span><span class="gd-checkout-cards" aria-hidden="true">VISA · MC · AMEX</span></div>' +
        '<div class="gd-field"><label class="gd-label">Card number</label><input class="gd-input" id="gd-checkout-number" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"/></div>' +
        '<div class="gd-checkout-row">' +
        '<div class="gd-field"><label class="gd-label">Expiry</label><input class="gd-input" id="gd-checkout-exp" placeholder="MM / YY" maxlength="7"/></div>' +
        '<div class="gd-field"><label class="gd-label">CVC</label><input class="gd-input" id="gd-checkout-cvc" inputmode="numeric" placeholder="123" maxlength="4"/></div>' +
        "</div>" +
        '<div class="gd-field"><label class="gd-label">Name on card</label><input class="gd-input" id="gd-checkout-name" placeholder="Full name"/></div>' +
        "</div>" +
        '<p class="gd-checkout-secure"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Encrypted checkout · Stripe · TLS 1.3</p>' +
        '<div class="gd-actions" style="justify-content:flex-start">' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-checkout-cancel">Cancel</button>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-checkout-pay">Pay <span id="gd-checkout-pay-amt">$25.00</span></button>' +
        "</div></div>"
    );
    var modal = document.querySelector("#gd-overlay-root .gd-modal");
    if (modal) modal.classList.add("gd-modal-checkout");

    var selected = 25;
    function syncAmt() {
      var pay = document.getElementById("gd-checkout-pay-amt");
      if (pay) pay.textContent = formatMoney(selected);
    }
    document.querySelectorAll(".gd-checkout-amt").forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll(".gd-checkout-amt").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        selected = Number(btn.getAttribute("data-amt"));
        var inp = document.getElementById("gd-checkout-amount");
        if (inp) inp.value = String(selected);
        syncAmt();
      };
    });
    var amtInput = document.getElementById("gd-checkout-amount");
    if (amtInput) {
      amtInput.oninput = function () {
        selected = Number(amtInput.value) || 25;
        document.querySelectorAll(".gd-checkout-amt").forEach(function (b) {
          b.classList.toggle("active", Number(b.getAttribute("data-amt")) === selected);
        });
        syncAmt();
      };
    }
    syncAmt();

    document.getElementById("gd-checkout-cancel").onclick = closeModal;
    document.getElementById("gd-checkout-pay").onclick = function () {
      var root = document.getElementById("gd-checkout-root");
      var payBtn = document.getElementById("gd-checkout-pay");
      if (!root || !payBtn) return;
      var num = (document.getElementById("gd-checkout-number").value || "").replace(/\s/g, "");
      if (num.length < 12) {
        toast("Enter a valid card number");
        return;
      }
      payBtn.disabled = true;
      runCheckoutProcessing(
        root,
        ["Authorizing card…", "Contacting issuer…", "Confirming GPU capacity…"],
        function () {
          renderCapacityFail(root, "billing");
        }
      );
    };
  }

  function creditTrainingBudget(run) {
    if (!run || run.status !== "completed") return;
    if (!isSignedIn()) return;
    if (getCreditedRuns().indexOf(run.id) >= 0) return;
    var budget = Number(run.maxBudget || 0);
    if (budget < MIN_BUDGET_CREDIT) return;
    markRunCredited(run.id);
    addCredits(budget, "Training budget credit · run " + run.id.slice(0, 8));
    toast("Training budget credited: " + formatMoney(budget));
  }

  function guardedOpenCreateEnvModal() {
    requireLabAccess(
      openCreateEnvModal,
      "Sign in and purchase a plan to create environments."
    );
  }

  function guardedOpenEvalModal(envId) {
    requireLabAccess(function () {
      requireComputeCredits(
        EVAL_COST,
        "Evaluations run on compute. Add credits before running.",
        function () {
          openEvalModal(envId);
        }
      );
    }, "Sign in and purchase a plan to run evaluations.");
  }

  function guardedOpenTrainModal(envId) {
    requireLabAccess(function () {
      openTrainModal(envId);
    }, "Sign in and purchase a plan to start training runs.");
  }

  function guardedOpenDeployFlow(run) {
    requireComputeCredits(
      DEPLOY_COST,
      "Deploy to Inference costs " + formatMoney(DEPLOY_COST) + " and mints a dedicated API key.",
      function () {
        openDeployFlow(run);
      }
    );
  }

  function openEnterpriseCallModal() {
    openModal(
      "Schedule a call",
      '<p class="gd-gate-lead">Tell us about your team and we will follow up to design an Enterprise plan.</p>' +
        '<div class="gd-field"><label class="gd-label">Work email <span class="gd-req">*</span></label>' +
        '<input class="gd-input" id="gd-ent-email" type="email" placeholder="you@company.com"/></div>' +
        '<div class="gd-field"><label class="gd-label">Company website</label>' +
        '<input class="gd-input" id="gd-ent-site" type="url" placeholder="https://company.com"/></div>' +
        '<div class="gd-field"><label class="gd-label">What do you need?</label>' +
        '<select class="gd-input" id="gd-ent-need">' +
        '<option value="compute">Dedicated GPU compute</option>' +
        '<option value="training">Training &amp; evaluations at scale</option>' +
        '<option value="inference">Private inference</option>' +
        '<option value="all">Full platform</option>' +
        "</select></div>" +
        '<div class="gd-field"><label class="gd-label">Message</label>' +
        '<textarea class="gd-input" id="gd-ent-msg" rows="3" placeholder="Team size, workload, timeline…"></textarea></div>' +
        '<div class="gd-actions" style="justify-content:flex-start;gap:0.5rem">' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-ent-cancel">Cancel</button>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-ent-submit">Request call</button>' +
        "</div>" +
        '<p class="gd-gpu-rent-note" id="gd-ent-note" style="color:var(--gd-muted)"></p>'
    );
    document.getElementById("gd-ent-cancel").onclick = closeModal;
    document.getElementById("gd-ent-submit").onclick = function () {
      var email = ((document.getElementById("gd-ent-email") || {}).value || "").trim();
      var note = document.getElementById("gd-ent-note");
      var btn = document.getElementById("gd-ent-submit");
      if (!email || email.indexOf("@") < 0) {
        toast("Work email required");
        return;
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }
      fetch("/api/book-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workEmail: email,
          companyWebsite: ((document.getElementById("gd-ent-site") || {}).value || "").trim(),
          primaryNeed: ((document.getElementById("gd-ent-need") || {}).value || "").trim(),
          stage: "enterprise",
          message: ((document.getElementById("gd-ent-msg") || {}).value || "").trim(),
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, data: d };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Request call";
            }
            if (note) note.textContent = res.data.error || "Could not submit. Try again.";
            return;
          }
          closeModal();
          toast("Thanks — we will reach out shortly");
        })
        .catch(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Request call";
          }
          if (note) note.textContent = "Could not reach the server.";
        });
    };
  }

  function selectBillingPlan(planId) {
    var plans = {
      pro: { id: "pro", name: "Pro", price: 49, credits: 50 },
      premium: { id: "premium", name: "Premium", price: 149, credits: 200 },
    };
    var plan = plans[planId];
    if (!plan) return;
    if (!isSignedIn()) {
      openSignInModal(function () {
        selectBillingPlan(planId);
      });
      return;
    }
    window.__gdCheckoutPendingPlan = plan;
    window.__gdCheckoutKeepPlan = true;
    openAddCreditsCheckout(function () {
      toast(plan.name + " plan activated · +" + formatMoney(plan.credits) + " credits");
      renderBillingPage();
    });
    setTimeout(function () {
      var title = document.querySelector("#gd-overlay-root #gd-modal-title");
      if (title) title.textContent = "Checkout · " + plan.name;
      var inp = document.getElementById("gd-checkout-amount");
      if (inp) {
        inp.value = String(plan.price);
        inp.readOnly = true;
        inp.dispatchEvent(new Event("input"));
      }
      document.querySelectorAll(".gd-checkout-amt").forEach(function (b) {
        b.classList.toggle("active", Number(b.getAttribute("data-amt")) === plan.price);
        b.disabled = true;
      });
      var pay = document.getElementById("gd-checkout-pay-amt");
      if (pay) pay.textContent = formatMoney(plan.price);
      var sub = document.querySelector(".gd-checkout-sub");
      if (sub) sub.textContent = "Subscribe · includes " + formatMoney(plan.credits) + " monthly compute credits";
    }, 50);
  }

  function renderBillingPage() {
    var host = document.getElementById("gd-billing-host");
    if (!host) return;
    var account = getAccount();
    var history = getBillingHistory();
    var currentPlan = null;
    try {
      currentPlan = JSON.parse(localStorage.getItem("gd-billing-plan") || "null");
    } catch (e) {}

    var tiers = [
      {
        id: "pro",
        name: "Pro",
        price: "$49",
        period: "/ month",
        blurb: "For individuals shipping evals and training loops.",
        cta: "Get Pro",
        action: "pro",
        featured: false,
        benefits: [
          "$50 monthly compute credits",
          "Environments, evaluations & training",
          "Lab API keys for evals, training, and GPUs",
          "On-Demand GPU rentals",
          "1 workspace seat",
          "Community support",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        price: "$149",
        period: "/ month",
        blurb: "For teams that need priority compute and higher limits.",
        cta: "Get Premium",
        action: "premium",
        featured: true,
        benefits: [
          "$200 monthly compute credits",
          "Priority On-Demand GPU queue",
          "Higher Lab API rate limits",
          "Shared team workspace (5 seats)",
          "Usage analytics & invoices",
          "Email support",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Custom",
        period: "",
        blurb: "Dedicated capacity, security, and SLAs for production labs.",
        cta: "Schedule a call",
        action: "enterprise",
        featured: false,
        benefits: [
          "Dedicated / reserved GPU clusters",
          "SSO, SOC2-ready controls & audit logs",
          "Private environments & custom models",
          "Unlimited seats & volume pricing",
          "SLA + dedicated success engineer",
          "Custom contracts & invoicing",
        ],
      },
    ];

    host.innerHTML =
      '<div class="gd-billing-page">' +
      '<header class="gd-billing-hero">' +
      "<h1>Manage Billing</h1>" +
      "<p>Lab plans cover evaluations, training, and On-Demand GPUs. Public model chat on Inference is separate: connect a wallet holding 20,000 $FRONTIER on Robinhood Chain.</p>" +
      "</header>" +
      '<div class="gd-billing-tiers">' +
      tiers
        .map(function (t) {
          return (
            '<article class="gd-plan-card' +
            (t.featured ? " is-featured" : "") +
            (currentPlan && currentPlan.id === t.id ? " is-current" : "") +
            '">' +
            '<div class="gd-plan-card-bg" aria-hidden="true"></div>' +
            '<div class="gd-plan-card-shade" aria-hidden="true"></div>' +
            '<div class="gd-plan-card-body">' +
            (t.featured ? '<span class="gd-plan-badge">Most popular</span>' : "") +
            '<h2 class="gd-plan-name">' +
            escapeHtml(t.name) +
            "</h2>" +
            '<p class="gd-plan-blurb">' +
            escapeHtml(t.blurb) +
            "</p>" +
            '<div class="gd-plan-price"><span class="gd-plan-amount">' +
            escapeHtml(t.price) +
            '</span><span class="gd-plan-period">' +
            escapeHtml(t.period) +
            "</span></div>" +
            "<ul class=\"gd-plan-benefits\">" +
            t.benefits
              .map(function (b) {
                return "<li>" + escapeHtml(b) + "</li>";
              })
              .join("") +
            "</ul>" +
            '<button type="button" class="gd-plan-cta" data-plan="' +
            escapeHtml(t.action) +
            '">' +
            escapeHtml(t.cta) +
            "</button>" +
            "</div></article>"
          );
        })
        .join("") +
      "</div>" +
      (account
        ? '<div class="gd-billing-meta">' +
          '<div class="gd-billing-grid">' +
          '<div class="gd-billing-card gd-billing-balance">' +
          '<span class="k">Available balance</span>' +
          '<span class="v">' +
          formatMoney(getCredits()) +
          "</span>" +
          '<button type="button" class="gd-btn gd-btn-primary" id="gd-billing-add">Add credits</button>' +
          "</div>" +
          '<div class="gd-billing-card">' +
          '<span class="k">Account</span>' +
          '<span class="v gd-billing-email">' +
          escapeHtml(account.email) +
          "</span>" +
          (currentPlan
            ? '<span class="gd-billing-plan-chip">' + escapeHtml(currentPlan.name) + "</span>"
            : "") +
          "</div>" +
          '<div class="gd-billing-card">' +
          '<span class="k">Deploy cost</span>' +
          '<span class="v">' +
          formatMoney(DEPLOY_COST) +
          " / deploy</span></div></div>" +
          '<h3 class="gd-billing-history-title">Usage history</h3>' +
          (history.length
            ? '<table class="gd-table gd-billing-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead><tbody>' +
              history
                .map(function (h) {
                  return (
                    "<tr><td>" +
                    new Date(h.at).toLocaleString() +
                    "</td><td>" +
                    escapeHtml(h.label) +
                    "</td><td class=\"" +
                    (h.type === "credit" ? "gd-bill-credit" : "gd-bill-debit") +
                    '">' +
                    (h.type === "credit" ? "+" : "−") +
                    formatMoney(h.amount) +
                    "</td><td>" +
                    formatMoney(h.balance) +
                    "</td></tr>"
                  );
                })
                .join("") +
              "</tbody></table>"
            : '<p class="gd-billing-empty">No usage yet. Subscribe or add credits to get started.</p>') +
          "</div>"
        : '<div class="gd-billing-signin"><p>Sign in to manage credits and view usage history.</p>' +
          '<button type="button" class="gd-btn gd-btn-primary" id="gd-billing-signin">Sign in</button></div>') +
      "</div>";

    var signBtn = document.getElementById("gd-billing-signin");
    if (signBtn)
      signBtn.onclick = function () {
        openSignInModal(function () {
          renderBillingPage();
        });
      };
    var addBtn = document.getElementById("gd-billing-add");
    if (addBtn) addBtn.onclick = function () {
      window.__gdCheckoutPendingPlan = null;
      openAddCreditsCheckout(function () {
        renderBillingPage();
      });
    };
    host.querySelectorAll(".gd-plan-cta").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var plan = btn.getAttribute("data-plan");
        if (plan === "enterprise") openEnterpriseCallModal();
        else selectBillingPlan(plan);
      });
    });
  }

  function wireBillingPage() {
    if (pageKind() !== "billing") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdBilling === "1") return;
    main.dataset.gdBilling = "1";
    var inner = main.querySelector(".min-w-0") || main;
    inner.innerHTML = '<div id="gd-billing-host" style="padding:1rem"></div>';
    renderBillingPage();
  }

  function menuItem(href, label, iconHtml, active) {
    return (
      '<li data-sidebar="menu-item" class="group/menu-item relative">' +
      '<a data-sidebar="menu-button" data-size="default" data-active="' +
      (active ? "true" : "false") +
      '" class="' +
      MENU_BTN +
      (active ? " gd-nav-active" : "") +
      '" href="' +
      href +
      '">' +
      iconHtml +
      "<span>" +
      label +
      "</span></a></li>"
    );
  }

  function iconImg(file) {
    return (
      '<img src="/lab-dashboard/images/icon-svgs/sidebar/' +
      file +
      '" alt="" class="gd-nav-icon h-4 w-4 shrink-0 object-contain"/>'
    );
  }

  function iconHome() {
    return iconImg("home-icon.svg");
  }

  function iconOverview() {
    return iconImg("dashboard-icon.svg");
  }

  function iconEnvironments() {
    return iconImg("sandboxes-icon.svg");
  }

  function iconEvaluations() {
    return iconImg("evaluations-icon.svg");
  }

  function iconTraining() {
    return iconImg("testing-icon.svg");
  }

  function iconInference() {
    return iconImg("inference-icon.svg");
  }

  function iconRouter() {
    return iconImg("router-icon.svg");
  }

  function iconTrophy() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-4 w-4 shrink-0"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
  }

  function iconGpu() {
    return iconImg("on-demand-gpus-icon.svg");
  }

  function iconInstances() {
    return iconImg("instances-icon.svg");
  }

  function sidebarGroupLabel(text, href) {
    var body = href
      ? '<a href="' + href + '" class="gd-sidebar-group-link">' + text + "</a>"
      : text;
    return (
      '<div data-sidebar="group-label" class="flex shrink-0 items-center rounded-md font-favorit-mono my-2 h-auto px-2 py-1 text-[11px] font-normal leading-4 tracking-[0.02em] text-[#d0d3d8]">' +
      body +
      "</div>"
    );
  }

  function linkifyGroupLabel(el, href) {
    if (!el) return;
    el.classList.remove("text-[#787b82]");
    if ((" " + el.className + " ").indexOf(" text-[#d0d3d8] ") < 0) {
      el.className += " text-[#d0d3d8]";
    }
    var existing = el.querySelector("a");
    var text = (el.textContent || "").trim();
    if (existing) {
      existing.setAttribute("href", href);
      existing.classList.add("gd-sidebar-group-link");
      return;
    }
    el.innerHTML = '<a href="' + href + '" class="gd-sidebar-group-link">' + text + "</a>";
  }

  function sidebarGroup(id, label, menuHtml, href) {
    return (
      '<div data-sidebar="group" id="' +
      id +
      '" class="relative flex w-full min-w-0 flex-col p-2 -mt-2 px-2 pb-0 pt-0">' +
      sidebarGroupLabel(label, href) +
      '<div data-sidebar="group-content" class="w-full text-sm"><ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-0">' +
      menuHtml +
      "</ul></div></div>"
    );
  }

  function sidebarMenuGroup(id, menuHtml) {
    return (
      '<div data-sidebar="group" id="' +
      id +
      '" class="relative flex w-full min-w-0 flex-col p-2 px-2 pb-0 pt-0">' +
      '<div data-sidebar="group-content" class="w-full text-sm"><ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-0">' +
      menuHtml +
      "</ul></div></div>"
    );
  }

  function setMenuLinkIcon(a, iconHtml) {
    if (!a || !iconHtml) return;
    var span = a.querySelector("span");
    var text = span ? span.textContent : (a.textContent || "").replace(/\s+/g, " ").trim();
    a.innerHTML = iconHtml + "<span>" + text + "</span>";
  }

  function normalizeMenuIcons(menu) {
    if (!menu) return;
    menu.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href === "/lab" || href === "/lab/dashboard/home") setMenuLinkIcon(a, iconHome());
      else if (href === "/lab/leaderboard") setMenuLinkIcon(a, iconTrophy());
      else if (href.indexOf("/environments") >= 0) setMenuLinkIcon(a, iconEnvironments());
      else if (href.indexOf("/evaluations") >= 0) setMenuLinkIcon(a, iconEvaluations());
      else if (href.indexOf("/training") >= 0) setMenuLinkIcon(a, iconTraining());
      else if (href === "/lab/inference") setMenuLinkIcon(a, iconInference());
      else if (href === "/lab/router") setMenuLinkIcon(a, iconRouter());
      else if (href.indexOf("/on-demand-gpus") >= 0) setMenuLinkIcon(a, iconGpu());
      else if (href.indexOf("/instances") >= 0) setMenuLinkIcon(a, iconInstances());
    });
  }

  function reorderLabMenu(labMenu) {
    if (!labMenu) return;
    var order = [
      "/lab/leaderboard",
      "/lab/dashboard/environments",
      "/lab/dashboard/evaluations",
      "/lab/dashboard/training",
    ];
    order.forEach(function (href) {
      var a = labMenu.querySelector('a[href="' + href + '"]');
      if (!a) return;
      var li = a.closest('[data-sidebar="menu-item"]');
      if (li) labMenu.appendChild(li);
    });
  }

  function removeHomeFromLabMenu(labMenu) {
    if (!labMenu) return;
    labMenu.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href === "/lab" || href === "/lab/dashboard/home") {
        var item = a.closest('[data-sidebar="menu-item"]') || a.parentElement;
        if (item) item.remove();
      }
    });
  }

  function removeInferenceFromMenu(menu) {
    if (!menu) return;
    menu.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var label = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (label === "Inference" || href.indexOf("/inference") >= 0) {
        var item = a.closest('[data-sidebar="menu-item"]') || a.parentElement;
        if (item) item.remove();
      }
    });
  }

  function removeDuplicateHomeGroups(sidebarContent, keepId) {
    if (!sidebarContent) return;
    sidebarContent.querySelectorAll('[data-sidebar="group"]').forEach(function (group) {
      if (keepId && group.id === keepId) return;
      var links = group.querySelectorAll('a[href]');
      if (links.length !== 1) return;
      var href = links[0].getAttribute("href") || "";
      if (href === "/lab" || href === "/lab/dashboard/home") group.remove();
    });
  }

  function removeSidebarSpacers(sidebarContent) {
    if (!sidebarContent) return;
    sidebarContent.querySelectorAll("button").forEach(function (btn) {
      var label = (btn.getAttribute("aria-label") || "").trim();
      var cls = btn.className || "";
      if (label === "Collapse sidebar" || cls.indexOf("flex-1") >= 0) {
        btn.remove();
      }
    });
    sidebarContent.querySelectorAll(".mt-auto, .mb-2.mt-auto").forEach(function (el) {
      if (el.querySelector('a[href="/lab/dashboard/support"], a[href*="docs.gradientrl"]')) {
        el.remove();
      }
    });
  }

  function fixLegalPolicyLinks(root) {
    var scope = root || document;
    scope.querySelectorAll('a[href*="privacy-policy"], a[href*="terms-of-service"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var isPrivacy = href.indexOf("privacy") >= 0;
      a.setAttribute("href", isPrivacy ? "/privacy" : "/terms");
      a.removeAttribute("target");
      a.removeAttribute("rel");
      if (!a.querySelector("img") && !a.querySelector("svg")) {
        a.insertAdjacentHTML("afterbegin", iconImg(isPrivacy ? "privacy-icon.svg" : "terms-icon.svg"));
      }
    });
  }

  function patchSidebarReferenceLinks() {
    var sidebar = document.querySelector('[data-sidebar="sidebar"]');
    if (sidebar) {
      sidebar.querySelectorAll('a[href="/lab/dashboard/support"], a[href="/docs"]').forEach(function (a) {
        if (a.closest("#gd-sidebar-ref-links") || a.closest('[data-sidebar="footer"]')) return;
        var item =
          a.closest('[data-sidebar="menu-item"]') ||
          a.closest(".mt-auto") ||
          a.closest(".mb-2") ||
          a.parentElement;
        if (item) item.remove();
      });
    }

    var footer = document.querySelector('[data-sidebar="footer"]');
    if (!footer) return;

    var ref = document.getElementById("gd-sidebar-ref-links");
    if (!ref) {
      ref = document.createElement("div");
      ref.id = "gd-sidebar-ref-links";
      ref.className = "gd-sidebar-ref-links";
      footer.insertBefore(ref, footer.firstChild);
    }

    ref.innerHTML =
      '<a href="/lab/dashboard/support" class="gd-sidebar-ref-link">' +
      iconImg("send-icon.svg") +
      "Support</a>" +
      '<a href="/docs" class="gd-sidebar-ref-link">' +
      iconImg("documentation-icon.svg") +
      "Docs</a>" +
      '<a href="/privacy" class="gd-sidebar-ref-link">' +
      iconImg("privacy-icon.svg") +
      "Privacy</a>" +
      '<a href="/terms" class="gd-sidebar-ref-link">' +
      iconImg("terms-icon.svg") +
      "Terms</a>";

    fixLegalPolicyLinks(document);
  }

  function supportModalHtml() {
    return (
      '<div class="gd-support">' +
      '<p class="gd-support-lead">Get help with Olora Cloud — environments, evaluations, training, inference, billing, and GPU rentals.</p>' +
      '<div class="gd-support-grid">' +
      '<div class="gd-support-card">' +
      "<h3>Contact</h3>" +
      '<ul class="gd-support-list">' +
      '<li><span>Email</span><a href="mailto:support@olora.si">support@olora.si</a></li>' +
      '<li><span>Security</span><a href="mailto:support@olora.si">support@olora.si</a></li>' +
      '<li><span>Billing</span><a href="mailto:support@olora.si">support@olora.si</a></li>' +
      '<li><span>Status</span><a href="/status">olora.si</a></li>' +
      "</ul>" +
      "</div>" +
      '<div class="gd-support-card">' +
      "<h3>Response times</h3>" +
      '<ul class="gd-support-list">' +
      "<li><span>Critical outage</span><strong>&lt; 2 hours</strong></li>" +
      "<li><span>Account / billing</span><strong>&lt; 1 business day</strong></li>" +
      "<li><span>Product help</span><strong>&lt; 2 business days</strong></li>" +
      "<li><span>Feature requests</span><strong>Reviewed weekly</strong></li>" +
      "</ul>" +
      "</div>" +
      "</div>" +
      '<div class="gd-support-card gd-support-topics">' +
      "<h3>Common topics</h3>" +
      '<div class="gd-support-topic-grid">' +
      '<a href="/docs#environments">Environments &amp; scoring</a>' +
      '<a href="/docs#evaluations">Evaluations &amp; leaderboards</a>' +
      '<a href="/docs#training">Training jobs</a>' +
      '<a href="/docs#inference">Inference</a>' +
      '<a href="/docs#gpus">On-Demand GPUs</a>' +
      '<a href="/docs#billing">Credits &amp; billing</a>' +
      '<a href="/docs#api">API keys &amp; auth</a>' +
      '<a href="/security">Security policy</a>' +
      "</div>" +
      "</div>" +
      '<form class="gd-support-form" id="gd-support-form">' +
      "<h3>Send a support request</h3>" +
      '<label class="gd-support-field"><span>Work email</span><input name="email" type="email" required placeholder="you@company.com" /></label>' +
      '<label class="gd-support-field"><span>Category</span>' +
      '<select name="category" required>' +
      '<option value="">Select one</option>' +
      '<option>Lab / product</option>' +
      "<option>GPU / compute</option>" +
      "<option>Billing</option>" +
      "<option>API / integration</option>" +
      "<option>Security</option>" +
      "<option>Other</option>" +
      "</select></label>" +
      '<label class="gd-support-field"><span>Subject</span><input name="subject" required maxlength="120" placeholder="Short summary" /></label>' +
      '<label class="gd-support-field"><span>Details</span><textarea name="message" required rows="4" placeholder="What happened, what you expected, and any job/run IDs."></textarea></label>' +
      '<div class="gd-support-actions">' +
      '<button type="submit" class="gd-support-submit">Submit request</button>' +
      '<p class="gd-support-note">We reply by email. For live status, see <a href="/status">Platform Status</a>.</p>' +
      "</div>" +
      "</form>" +
      '<div class="gd-support-done" id="gd-support-done" hidden>' +
      "<h3>Request received</h3>" +
      "<p>Thanks — support will follow up at the email you provided.</p>" +
      '<button type="button" class="gd-support-submit" data-gd-support-close="true">Close</button>' +
      "</div>" +
      "</div>"
    );
  }

  function openSupportModal() {
    openModal("Support", supportModalHtml());
    var modal = document.querySelector("#gd-overlay-root .gd-modal");
    if (modal) modal.classList.add("gd-modal-wide", "gd-modal-support");
    var form = document.getElementById("gd-support-form");
    var done = document.getElementById("gd-support-done");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        email: String(fd.get("email") || ""),
        company: "Support request",
        need: String(fd.get("category") || "Support"),
        stage: "In production",
        message:
          "[" +
          String(fd.get("category") || "Support") +
          "] " +
          String(fd.get("subject") || "") +
          "\n\n" +
          String(fd.get("message") || ""),
        source: "lab-support",
      };
      fetch("/api/book-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(function () {});
      form.hidden = true;
      if (done) done.hidden = false;
    });
  }

  function wireSupportTriggers() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("[data-gd-support-close]")) {
        e.preventDefault();
        closeModal();
        return;
      }
      var open = t.closest("[data-gd-support-open]");
      if (open) {
        e.preventDefault();
        openSupportModal();
        return;
      }
    });
  }

  function rewriteSidebarHrefs() {
    document.querySelectorAll("a[href]").forEach(function (a) {
      if (a.closest("[data-sidebar='sidebar']") === null && a.closest("[data-sidebar='footer']") === null) {
        return;
      }
      var href = a.getAttribute("href") || "";
      if (href === "/lab" || href === "/lab/") {
        var label = (a.textContent || "").replace(/\s+/g, " ").trim();
        if (label === "Home") a.setAttribute("href", "/lab/dashboard/home");
      } else if (href === "/lab/dashboard/inference" || href.indexOf("/lab/dashboard/inference") === 0) {
        a.setAttribute("href", "/lab/inference");
      } else if (href === "https://olora.si" || href.indexOf("https://olora.si") === 0) {
        a.setAttribute("href", "/docs");
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
    });
  }

  function wireSidebarCollapse() {
    var toggle = document.querySelector(
      '[data-sidebar="header"] button[aria-label="Collapse sidebar"], [data-sidebar="header"] button[aria-label="Expand sidebar"]'
    );
    var wrap = document.querySelector('[data-variant="sidebar"]');
    if (!toggle || !wrap || toggle.dataset.gdCollapse === "1") return;
    toggle.dataset.gdCollapse = "1";
    function apply(collapsed) {
      wrap.setAttribute("data-state", collapsed ? "collapsed" : "expanded");
      wrap.setAttribute("data-collapsible", collapsed ? "icon" : "");
      toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      toggle.setAttribute("data-state", collapsed ? "open" : "closed");
      var img = toggle.querySelector("img");
      if (img) {
        img.src = collapsed
          ? "/lab-dashboard/images/icon-svgs/sidebar/sidebar-expand-icon.svg"
          : "/lab-dashboard/images/icon-svgs/sidebar/sidebar-collapse-icon.svg";
      }
    }
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      apply(wrap.getAttribute("data-collapsible") !== "icon");
    });
  }

  function patchSidebar() {
    var kind = pageKind();
    var sidebar =
      document.querySelector('[data-sidebar="sidebar"]') ||
      document.querySelector("aside.gd-sidebar") ||
      document.querySelector(".gd-shell aside");

    if (window.GDLabNav && typeof window.GDLabNav.mountStaticNav === "function" && sidebar) {
      var active = kind;
      if (kind === "gpus" || kind === "compute" || kind === "instances") active = "compute";
      if (kind === "home" || kind === "quickstart" || kind === "overview") active = "home";
      if (kind === "dashboard") active = "dashboard";
      if (kind === "inference") active = "models";
      window.GDLabNav.mountStaticNav(sidebar, active);
      patchBrand();
      return;
    }

    var labLabel = Array.prototype.find.call(
      document.querySelectorAll('[data-sidebar="group-label"]'),
      function (el) {
        return (el.textContent || "").trim() === "LAB";
      }
    );
    if (!labLabel) return;

    var labGroup = labLabel.closest('[data-sidebar="group"]');
    if (!labGroup) return;
    var labMenu = labGroup.querySelector('[data-sidebar="menu"]');
    if (!labMenu) return;
    var sidebarContent = labGroup.parentElement;
    if (!sidebarContent) return;

    labMenu.querySelectorAll('a[href="/lab/arena"]').forEach(function (a) {
      var item = a.closest('[data-sidebar="menu-item"]') || a.parentElement;
      if (item) item.remove();
    });

    removeInferenceFromMenu(labMenu);
    removeHomeFromLabMenu(labMenu);

    if (!labMenu.querySelector('a[href="/lab/leaderboard"]')) {
      labMenu.insertAdjacentHTML(
        "afterbegin",
        menuItem("/lab/leaderboard", "Leaderboard", iconTrophy(), kind === "leaderboard")
      );
    }

    reorderLabMenu(labMenu);
    normalizeMenuIcons(labMenu);

    var refGroup = document.getElementById("gd-reference-group");
    if (refGroup) refGroup.remove();

    var homeGroup = document.getElementById("gd-home-group");
    if (!homeGroup) {
      sidebarContent.insertAdjacentHTML(
        "afterbegin",
        sidebarMenuGroup(
          "gd-home-group",
          menuItem("/lab/dashboard/home", "Home", iconHome(), kind === "home" || kind === "quickstart") +
            menuItem("/lab/dashboard/overview", "Dashboard", iconOverview(), kind === "overview")
        )
      );
      homeGroup = document.getElementById("gd-home-group");
    } else {
      var homeMenu = homeGroup.querySelector('[data-sidebar="menu"]');
      if (homeMenu && !homeMenu.querySelector('a[href="/lab/dashboard/overview"]')) {
        homeMenu.insertAdjacentHTML(
          "beforeend",
          menuItem("/lab/dashboard/overview", "Dashboard", iconOverview(), kind === "overview")
        );
      }
      if (homeMenu) {
        homeMenu.querySelectorAll("a[href]").forEach(function (a) {
          var href = a.getAttribute("href") || "";
          var active =
            ((href === "/lab" || href === "/lab/dashboard/home") && (kind === "home" || kind === "quickstart")) ||
            (href === "/lab/dashboard/overview" && kind === "overview");
          a.setAttribute("data-active", active ? "true" : "false");
        });
      }
    }

    var inferenceGroup = document.getElementById("gd-inference-group");
    if (!inferenceGroup) {
      labGroup.insertAdjacentHTML(
        "beforebegin",
        sidebarGroup(
          "gd-inference-group",
          "INFERENCE",
          menuItem("/lab/inference", "Inference", iconInference(), kind === "inference") +
            menuItem("/lab/router", "Model Router", iconRouter(), kind === "router"),
          "/lab/inference"
        )
      );
      inferenceGroup = document.getElementById("gd-inference-group");
    } else {
      var infMenu = inferenceGroup.querySelector('[data-sidebar="menu"]');
      if (infMenu && !infMenu.querySelector('a[href="/lab/router"]')) {
        infMenu.insertAdjacentHTML(
          "beforeend",
          menuItem("/lab/router", "Model Router", iconRouter(), kind === "router")
        );
      }
    }

    var computeGroup = document.getElementById("gd-compute-group");
    if (!computeGroup) {
      var computeHtml = sidebarGroup(
        "gd-compute-group",
        "COMPUTE",
        menuItem("/lab/dashboard/on-demand-gpus", "On-Demand GPUs", iconGpu(), kind === "gpus") +
          menuItem("/lab/dashboard/instances", "Instances", iconInstances(), kind === "instances"),
        "/lab/dashboard/on-demand-gpus"
      );
      if (inferenceGroup) inferenceGroup.insertAdjacentHTML("afterend", computeHtml);
      else labGroup.insertAdjacentHTML("beforebegin", computeHtml);
      computeGroup = document.getElementById("gd-compute-group");
    } else if (inferenceGroup && computeGroup && computeGroup.nextElementSibling !== labGroup) {
      inferenceGroup.insertAdjacentElement("afterend", computeGroup);
    }

    var computeMenu = computeGroup && computeGroup.querySelector('[data-sidebar="menu"]');
    normalizeMenuIcons(computeMenu);
    var inferenceMenu = inferenceGroup && inferenceGroup.querySelector('[data-sidebar="menu"]');
    normalizeMenuIcons(inferenceMenu);
    var homeMenu = homeGroup && homeGroup.querySelector('[data-sidebar="menu"]');
    normalizeMenuIcons(homeMenu);

    removeSidebarSpacers(sidebarContent);
    removeDuplicateHomeGroups(sidebarContent, "gd-home-group");

    var ordered = [homeGroup, inferenceGroup, computeGroup, labGroup].filter(Boolean);
    for (var i = ordered.length - 1; i >= 0; i--) {
      sidebarContent.insertBefore(ordered[i], sidebarContent.firstChild);
    }

    patchSidebarReferenceLinks();
    rewriteSidebarHrefs();
    linkifyGroupLabel(
      inferenceGroup && inferenceGroup.querySelector('[data-sidebar="group-label"]'),
      "/lab/inference"
    );
    linkifyGroupLabel(
      computeGroup && computeGroup.querySelector('[data-sidebar="group-label"]'),
      "/lab/dashboard/on-demand-gpus"
    );
    linkifyGroupLabel(labLabel, "/lab/leaderboard");
    wireSidebarCollapse();

    document.querySelectorAll('[data-sidebar="menu"] a[href]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var active =
        ((kind === "home" || kind === "quickstart") &&
          (href === "/lab" || href === "/lab/dashboard/home")) ||
        (kind === "overview" && href === "/lab/dashboard/overview") ||
        (kind === "arena" && href === "/lab/arena") ||
        (kind === "leaderboard" && href === "/lab/leaderboard") ||
        (kind === "inference" && (href === "/lab/inference" || href.indexOf("/dashboard/inference") >= 0)) ||
        (kind === "router" && href === "/lab/router") ||
        (kind === "environments" && href.indexOf("/environments") >= 0) ||
        (kind === "evaluations" && href.indexOf("/evaluations") >= 0) ||
        (kind === "training" && href.indexOf("/training") >= 0) ||
        (kind === "gpus" && href.indexOf("/on-demand-gpus") >= 0) ||
        (kind === "instances" && href.indexOf("/instances") >= 0) ||
        (kind === "billing" && href.indexOf("/billing") >= 0);
      a.setAttribute("data-active", active ? "true" : "false");
      if (active) a.classList.add("gd-nav-active");
      else a.classList.remove("gd-nav-active");
    });

    refreshSidebarAccount();
  }

  function patchBrand() {
    var LOGO = "/brand/tensora-mark-white.svg";
    document.querySelectorAll('a[aria-label="Syntropy home"], a[aria-label="Olora home"], a.gd-brand').forEach(function (a) {
      a.setAttribute("aria-label", "Olora home");
      a.setAttribute("href", "/lab/home");
      a.classList.add("gd-brand");
      var img = a.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        a.insertBefore(img, a.firstChild);
      }
      img.classList.remove("gd-brand-wordmark");
      img.classList.add("gd-brand-mark");
      img.src = LOGO;
      img.alt = "";
      img.removeAttribute("width");
      img.removeAttribute("height");
      img.style.height = "";
      img.style.width = "";
      a.querySelectorAll(".gd-brand-name").forEach(function (span) {
        span.remove();
      });
      var word = a.querySelector("img.gd-brand-word");
      if (!word) {
        word = document.createElement("img");
        word.className = "gd-brand-word";
        word.alt = "Olora";
        a.appendChild(word);
      }
      word.src = "/brand/olora-wordmark-ice.png";
    });
  }

  function rewriteHome() {
    if (pageKind() !== "home") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdHome === "1") return;
    main.dataset.gdHome = "1";

    var wrap = main.querySelector(".mx-auto.w-full.max-w-5xl") || main.querySelector(".max-w-5xl") || main;
    var banner = document.createElement("div");
    banner.className = "gd-home-banner";
    banner.innerHTML =
      "<h2>The lab for training and improving AI models.</h2>" +
      "<p>Olora Cloud is a full AI training suite. Pick an environment, evaluate models on real jobs, train until scores improve, then scale on GPUs.</p>";
    wrap.insertBefore(banner, wrap.firstChild);

    // Rewrite card grid descriptions if present
    var cards = [
      {
        href: "/lab/dashboard/overview",
        title: "Dashboard",
        desc: "Company pulse: revenue, inference pool, GPU spend, and lab funnel.",
      },
      {
        href: "/lab/inference",
        title: "Inference",
        desc: "Chat with 400+ models. Connect a wallet holding 20,000 $FRONTIER on Robinhood Chain to unlock.",
      },
      {
        href: "/lab/dashboard/on-demand-gpus",
        title: "On-Demand GPUs",
        desc: "Browse H100, H200, and B200 inventory, then rent compute through Prime Intellect.",
      },
      {
        href: "/lab/leaderboard",
        title: "Leaderboard",
        desc: "See which models and providers lead on quality, price, and speed.",
      },
      {
        href: "/lab/dashboard/environments",
        title: "Environments",
        desc: "Browse tasks and jobs your models can be tested and trained on.",
      },
      {
        href: "/lab/dashboard/evaluations",
        title: "Evaluations",
        desc: "Run a model on a job and score how well it performs.",
      },
      {
        href: "/lab/dashboard/training",
        title: "Training",
        desc: "Pick a job and a model, run training, and compare before and after.",
      },
    ];

    var labSection = null;
    wrap.querySelectorAll("h2").forEach(function (h) {
      if ((h.textContent || "").trim() === "Lab") labSection = h.parentElement;
    });
    if (labSection) {
      var grid = labSection.querySelector(".grid");
      if (grid) {
        grid.innerHTML = cards
          .map(function (c) {
            return (
              '<a class="block" href="' +
              c.href +
              '"><div class="rounded-md bg-background text-foreground border group relative h-40 cursor-pointer overflow-hidden">' +
              '<div class="absolute inset-0 bg-black/55"></div>' +
              '<div class="relative z-10 flex h-full flex-col justify-end p-4">' +
              '<div class="tracking-tight text-base font-medium">' +
              c.title +
              "</div>" +
              '<p class="mt-1 text-sm text-muted-foreground">' +
              c.desc +
              "</p></div></div></a>"
            );
          })
          .join("");
      }
    }

    // Quickstart copy + stronger brand-blue plate
    wrap.querySelectorAll("p").forEach(function (p) {
      var t = p.textContent || "";
      if (t.indexOf("Install the CLI") >= 0 || t.indexOf("Start in Arena") >= 0 || t.indexOf("Compare models in Arena") >= 0) {
        p.textContent =
          "Pick an environment, run an evaluation, then start a training job and check the results.";
      }
    });

    // Cache-bust + boost opacity on Quickstart / Account plates
    wrap.querySelectorAll('[style*="background-image"]').forEach(function (el) {
      var s = el.getAttribute("style") || "";
      if (s.indexOf("/images/home/lab.jpg") >= 0) {
        el.setAttribute(
          "style",
          s
            .replace(/\/images\/home\/lab\.jpg[^)"]*/g, "/images/home/lab.jpg?v=gd-blue4")
            .replace(/opacity-\d+|opacity:\s*[\d.]+/g, "")
            .replace(/background-size:[^;]+;?/g, "background-size:cover;") +
            ";opacity:0.85"
        );
        el.style.opacity = "0.85";
        el.style.backgroundSize = "cover";
        el.style.backgroundImage = "url(/images/home/lab.jpg?v=gd-blue4)";
      }
      if (s.indexOf("/images/home/billing.jpg") >= 0) {
        el.style.opacity = "0.8";
        el.style.backgroundImage = el.style.backgroundImage.replace(
          /\/images\/home\/billing\.jpg[^)"]*/g,
          "/images/home/billing.jpg?v=gd-blue2"
        );
        if (!el.style.backgroundImage || el.style.backgroundImage.indexOf("billing") < 0) {
          var pos = (s.match(/background-position:([^;]+)/) || [])[1] || "center";
          el.style.backgroundImage = "url(/images/home/billing.jpg?v=gd-blue2)";
          el.style.backgroundSize = "300% auto";
          el.style.backgroundPosition = pos;
        }
      }
    });

    // Account card microcopy
    wrap.querySelectorAll("a").forEach(function (a) {
      var title = a.querySelector(".tracking-tight");
      var desc = a.querySelector("p");
      if (!title || !desc) return;
      var name = (title.textContent || "").trim();
      if (name === "Manage Billing") desc.textContent = "Track usage, invoices, and spend.";
      if (name === "Create API Key") desc.textContent = "Generate keys for the API and CLI.";
      if (name === "Edit Profile") desc.textContent = "Update your account details.";
    });

    // Home page legal row — replace dead external policy URLs + add icons
    fixLegalPolicyLinks(wrap);
    wrap.querySelectorAll('a[href="/privacy"], a[href="/terms"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var isPrivacy = href.indexOf("privacy") >= 0;
      if (!a.querySelector("img") && !a.querySelector("svg")) {
        a.insertAdjacentHTML("afterbegin", iconImg(isPrivacy ? "privacy-icon.svg" : "terms-icon.svg"));
      }
    });
    wrap.querySelectorAll('a[href*="olora.si"]').forEach(function (a) {
      if ((a.textContent || "").indexOf("Docs") < 0) return;
      a.setAttribute("href", "/docs");
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
  }

  function bindSupportForm(form, done, closeHref) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        email: String(fd.get("email") || ""),
        company: "Support request",
        need: String(fd.get("category") || "Support"),
        stage: "In production",
        message:
          "[" +
          String(fd.get("category") || "Support") +
          "] " +
          String(fd.get("subject") || "") +
          "\n\n" +
          String(fd.get("message") || ""),
        source: "lab-support-page",
      };
      fetch("/api/book-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(function () {});
      form.hidden = true;
      if (done) done.hidden = false;
    });
    var closeBtn = done && done.querySelector("[data-gd-support-close]");
    if (closeBtn && closeHref) {
      closeBtn.textContent = "Back to Lab";
      closeBtn.removeAttribute("data-gd-support-close");
      closeBtn.addEventListener("click", function () {
        location.href = closeHref;
      });
    }
  }

  function rewriteSupportPage() {
    if (pageKind() !== "support") return;
    var main = document.querySelector("main");
    if (!main) return;
    if (main.dataset.gdSupport === "1" || main.querySelector(".gd-support-page")) {
      bindSupportForm(
        document.getElementById("gd-support-form"),
        document.getElementById("gd-support-done"),
        "/lab"
      );
      return;
    }
    main.dataset.gdSupport = "1";
    document.title = "Support | Olora Cloud";
    main.innerHTML =
      '<div class="min-w-0 p-4 gd-support-page">' +
      '<header class="gd-account-hero" style="margin-bottom:1rem"><h1>Support</h1>' +
      "<p>Get help with environments, evaluations, training, inference, billing, and GPU rentals.</p></header>" +
      supportModalHtml() +
      "</div>";
    bindSupportForm(
      document.getElementById("gd-support-form"),
      document.getElementById("gd-support-done"),
      "/lab"
    );
  }

  function wireGpuPage() {
    if (pageKind() !== "gpus" && pageKind() !== "compute" && pageKind() !== "instances") return;

    if (pageKind() === "instances") {
      rewriteInstancesPage();
      return;
    }

    var main = document.querySelector("main");
    if (!main) return;
    var host = document.getElementById("gd-gpu-market");
    if (!host) {
      var inner = main.querySelector(".min-w-0") || main;
      host = document.createElement("div");
      host.id = "gd-gpu-market";
      host.className = "gd-gpu-market";
      inner.innerHTML = "";
      inner.appendChild(host);
    }

    renderGpuMarket(host);
  }

  function fmtGpuPrice(n) {
    if (n == null || isNaN(n)) return "—";
    return "$" + Number(n).toFixed(2);
  }

  function regionLabel(r) {
    var map = {
      united_states: "United States",
      canada: "Canada",
      europe_west: "Europe West",
      europe_east: "Europe East",
      asia_pacific: "Asia Pacific",
    };
    return map[r] || String(r || "").replace(/_/g, " ");
  }

  function providerLabel(p) {
    var map = {
      lambdalabs: "Lambda Cloud",
      runpod: "RunPod",
      massedcompute: "Massed Compute",
      datacrunch: "DataCrunch",
      hyperstack: "Hyperstack",
      nebius: "Nebius",
      tensordock: "TensorDock",
      fluidstack: "FluidStack",
      vultr: "Vultr",
      crusoecloud: "Crusoe",
    };
    return map[p] || String(p || "Provider");
  }

  function nvidiaIcon() {
    return '<img class="gd-gpu-nvidia" src="/lab-dashboard/images/icon-svgs/nvidia-logo.svg" alt="" width="20" height="14"/>';
  }

  function aggregateGpuModels(offers) {
    var byType = {};
    (offers || []).forEach(function (o) {
      var key = o.gpuType || o.label;
      var inStock = String(o.stockStatus).toLowerCase().indexOf("unavail") < 0 && Number(o.pricePerHour) > 0;
      if (!byType[key]) {
        byType[key] = {
          gpuType: key,
          label: o.label || String(key).replace(/_/g, " "),
          gpuMemory: o.gpuMemory || 0,
          counts: {},
          minPrice: Infinity,
          best: o,
          available: false,
          offers: [],
        };
      }
      var g = byType[key];
      g.offers.push(o);
      if (inStock) {
        g.counts[o.gpuCount] = true;
        g.available = true;
        if (o.pricePerHour < g.minPrice) {
          g.minPrice = o.pricePerHour;
          g.best = o;
        }
      }
      if (o.gpuMemory > g.gpuMemory) g.gpuMemory = o.gpuMemory;
    });
    return Object.keys(byType).map(function (k) {
      var g = byType[k];
      if (!isFinite(g.minPrice)) g.minPrice = 0;
      return g;
    });
  }

  var FEATURED_ORDER = ["B300_262GB", "B200_180GB", "H200_141GB", "H100_80GB"];

  function renderGpuMarket(host) {
    if (host.dataset.gdBound === "1") return;
    host.dataset.gdBound = "1";
    host._step = 1;
    host._mode = "single";
    host._count = "any";
    host._vram = "any";
    host._selectedType = null;
    host._offers = [];

    host.innerHTML =
      '<div class="gd-gpu-page">' +
      '<header class="gd-gpu-page-head">' +
      "<h1>Find compute</h1>" +
      "<p class=\"gd-gpu-sub\">Compare GPU capacity and pricing across infrastructure providers. Olora aggregates offers — View offer opens the provider.</p>" +
      "<p>Choose your GPU for your workload. Prices update in realtime.</p>" +
      "</header>" +
      '<div class="gd-gpu-node-tabs" role="tablist">' +
      '<button type="button" class="gd-gpu-node-tab active" data-mode="single">Single-Node</button>' +
      '<button type="button" class="gd-gpu-node-tab" data-mode="multi">Multi-Node</button>' +
      "</div>" +
      '<div class="gd-gpu-stepper-row">' +
      '<div class="gd-gpu-steps">' +
      '<button type="button" class="gd-gpu-step active" data-step="1"><span class="gd-gpu-step-num">1</span> Choose GPU</button>' +
      '<button type="button" class="gd-gpu-step" data-step="2" id="gd-gpu-step-2"><span class="gd-gpu-step-num">2</span> Compare Offers</button>' +
      "</div>" +
      '<div class="gd-gpu-search-wrap">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input id="gd-gpu-search" type="search" placeholder="Search GPU models..."/>' +
      "</div></div>" +
      '<div class="gd-gpu-filters" id="gd-gpu-filters">' +
      '<div class="gd-gpu-filter-card">' +
      '<div class="gd-gpu-filter-label">GPU Count</div>' +
      '<div class="gd-gpu-chips" id="gd-gpu-count-chips">' +
      '<button type="button" class="gd-gpu-chip" data-count="8plus">8+ Multi-node</button>' +
      '<button type="button" class="gd-gpu-chip active" data-count="any">Any</button>' +
      '<button type="button" class="gd-gpu-chip" data-count="1">1</button>' +
      '<button type="button" class="gd-gpu-chip" data-count="2">2</button>' +
      '<button type="button" class="gd-gpu-chip" data-count="4">4</button>' +
      '<button type="button" class="gd-gpu-chip" data-count="8">8</button>' +
      "</div></div>" +
      '<div class="gd-gpu-filter-card">' +
      '<div class="gd-gpu-filter-label">VRAM per GPU</div>' +
      '<div class="gd-gpu-chips" id="gd-gpu-vram-chips">' +
      ["any", "16", "24", "40", "48", "80", "96", "141"]
        .map(function (v, i) {
          return (
            '<button type="button" class="gd-gpu-chip' +
            (i === 0 ? " active" : "") +
            '" data-vram="' +
            v +
            '">' +
            (v === "any" ? "Any" : v) +
            "</button>"
          );
        })
        .join("") +
      "</div></div></div>" +
      '<div id="gd-gpu-body" class="gd-gpu-body"><div class="gd-gpu-status">Loading inventory…</div></div>' +
      "</div>";

    host.querySelectorAll(".gd-gpu-node-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host.querySelectorAll(".gd-gpu-node-tab").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        host._mode = btn.getAttribute("data-mode") || "single";
        if (host._mode === "multi") host._count = "8plus";
        else if (host._count === "8plus") host._count = "any";
        syncGpuChips(host);
        if (host._step === 1) paintGpuChoose(host);
        else paintGpuCompare(host);
      });
    });

    host.querySelectorAll(".gd-gpu-step").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = Number(btn.getAttribute("data-step") || 1);
        if (step === 2 && !host._selectedType) return;
        host._step = step;
        syncGpuSteps(host);
        if (step === 1) paintGpuChoose(host);
        else paintGpuCompare(host);
      });
    });

    host.querySelectorAll("#gd-gpu-count-chips .gd-gpu-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host._count = btn.getAttribute("data-count") || "any";
        syncGpuChips(host);
        if (host._step === 1) paintGpuChoose(host);
        else paintGpuCompare(host);
      });
    });

    host.querySelectorAll("#gd-gpu-vram-chips .gd-gpu-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host._vram = btn.getAttribute("data-vram") || "any";
        syncGpuChips(host);
        if (host._step === 1) paintGpuChoose(host);
        else paintGpuCompare(host);
      });
    });

    var search = document.getElementById("gd-gpu-search");
    if (search) {
      search.addEventListener("input", function () {
        if (host._step === 1) paintGpuChoose(host);
        else paintGpuCompare(host);
      });
    }

    loadGpuOffers(host);
  }

  function syncGpuSteps(host) {
    host.querySelectorAll(".gd-gpu-step").forEach(function (btn) {
      var step = Number(btn.getAttribute("data-step") || 1);
      btn.classList.toggle("active", step === host._step);
      btn.classList.toggle("done", step < host._step);
    });
    var filters = document.getElementById("gd-gpu-filters");
    if (filters) filters.style.display = host._step === 1 ? "" : "none";
  }

  function syncGpuChips(host) {
    host.querySelectorAll("#gd-gpu-count-chips .gd-gpu-chip").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-count") === host._count);
    });
    host.querySelectorAll("#gd-gpu-vram-chips .gd-gpu-chip").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-vram") === host._vram);
    });
  }

  function loadGpuOffers(host) {
    fetch("/api/lab/gpus")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        host._offers = data.offers || [];
        host._configured = !!data.configured;
        host._live = !!data.live;
        host._marketplace = data.marketplace || PRIME_GPUS;
        // Ensure featured placeholders exist when stock is thin
        ["B300_262GB", "B200_180GB"].forEach(function (t) {
          if (
            !host._offers.some(function (o) {
              return o.gpuType === t;
            })
          ) {
            host._offers.push({
              id: "placeholder-" + t,
              cloudId: t,
              gpuType: t,
              label: t.replace(/_/g, " ").replace("GB", "GB"),
              socket: "SXM",
              provider: "primeintellect",
              region: "united_states",
              country: "US",
              dataCenter: null,
              gpuCount: 1,
              gpuMemory: t.indexOf("B300") >= 0 ? 262 : 180,
              vcpu: 0,
              memoryGb: 0,
              pricePerHour: 0,
              stockStatus: "Unavailable",
              images: [],
              source: "catalog",
            });
          }
        });
        paintGpuChoose(host);
      })
      .catch(function () {
        var body = document.getElementById("gd-gpu-body");
        if (body) body.innerHTML = '<div class="gd-gpu-empty">Could not load GPU inventory.</div>';
      });
  }

  function filteredOffers(host) {
    var q = ((document.getElementById("gd-gpu-search") || {}).value || "").trim().toLowerCase();
    var mode = host._mode || "single";
    var count = host._count || "any";
    var vram = host._vram || "any";
    return (host._offers || []).filter(function (o) {
      if (mode === "single" && o.gpuCount > 1 && count === "any") return true; // keep for aggregation
      if (count === "8plus" && o.gpuCount < 8) return false;
      if (count !== "any" && count !== "8plus" && String(o.gpuCount) !== count) return false;
      if (vram !== "any" && Number(o.gpuMemory) < Number(vram)) return false;
      if (!q) return true;
      var hay = [o.label, o.gpuType, o.provider, o.region, o.socket].join(" ").toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function paintGpuChoose(host) {
    host._step = 1;
    syncGpuSteps(host);
    var body = document.getElementById("gd-gpu-body");
    if (!body) return;

    var models = aggregateGpuModels(filteredOffers(host));
    var q = ((document.getElementById("gd-gpu-search") || {}).value || "").trim().toLowerCase();
    if (q) {
      models = models.filter(function (m) {
        return (m.label + " " + m.gpuType).toLowerCase().indexOf(q) >= 0;
      });
    }

    var featured = [];
    FEATURED_ORDER.forEach(function (t) {
      var m = models.find(function (x) {
        return x.gpuType === t;
      });
      if (m) featured.push(m);
    });
    var rest = models.filter(function (m) {
      return FEATURED_ORDER.indexOf(m.gpuType) < 0;
    });
    rest.sort(function (a, b) {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.minPrice - b.minPrice;
    });

    function prettyName(m) {
      var map = {
        B300_262GB: "B300",
        B200_180GB: "B200",
        H200_141GB: "H200",
        H100_80GB: "H100",
        A100_80GB: "A100",
        A100_40GB: "A100",
        A6000_48GB: "A6000",
        L40_48GB: "L40",
        L40S_48GB: "L40S",
        RTX6000Ada_48GB: "RTX6000 Ada",
        RTX4090_24GB: "RTX 4090",
        A10_24GB: "A10",
        RTX_PRO_6000B_96GB: "RTX Pro 6000",
      };
      return map[m.gpuType] || m.label.replace(/_/g, " ").replace(/\s+\d+GB$/, "");
    }

    function cardHtml(m, featuredCard) {
      var counts = Object.keys(m.counts)
        .map(Number)
        .sort(function (a, b) {
          return b - a;
        });
      var availText = m.available
        ? "Available: " +
          counts
            .map(function (c) {
              return "x" + c;
            })
            .join(" · ")
        : "Unavailable";
      var priceText = m.available && m.minPrice > 0 ? fmtGpuPrice(m.minPrice) + "/HR" : "";
      var metaParts = [m.gpuMemory + " GB VRAM"];
      if (m.best && m.best.memoryGb) metaParts.push(m.best.memoryGb + " GB RAM");
      if (m.best && m.best.vcpu) metaParts.push(m.best.vcpu + " vCPUs");
      return (
        '<button type="button" class="gd-gpu-model-card' +
        (featuredCard ? " is-featured" : "") +
        (host._selectedType === m.gpuType ? " is-selected" : "") +
        (!m.available ? " is-unavailable" : "") +
        '" data-gpu-type="' +
        escapeHtml(m.gpuType) +
        '"' +
        (!m.available ? " disabled" : "") +
        ">" +
        nvidiaIcon() +
        '<div class="gd-gpu-model-name">' +
        escapeHtml(prettyName(m)) +
        "</div>" +
        (priceText ? '<div class="gd-gpu-model-price">' + escapeHtml(priceText) + "</div>" : "") +
        '<div class="gd-gpu-model-avail' +
        (m.available ? "" : " is-down") +
        '">' +
        escapeHtml(availText) +
        "</div>" +
        '<div class="gd-gpu-model-meta">' +
        escapeHtml(metaParts.join(" · ")) +
        "</div></button>"
      );
    }

    body.innerHTML =
      (featured.length
        ? '<div class="gd-gpu-section-label">Featured</div><div class="gd-gpu-model-grid featured">' +
          featured.map(function (m) {
            return cardHtml(m, true);
          }).join("") +
          "</div>"
        : "") +
      '<div class="gd-gpu-section-label">All GPU Models</div>' +
      '<div class="gd-gpu-model-grid">' +
      (rest.length
        ? rest
            .map(function (m) {
              return cardHtml(m, false);
            })
            .join("")
        : '<div class="gd-gpu-empty">No GPUs match these filters.</div>') +
      "</div>";

    body.querySelectorAll(".gd-gpu-model-card:not([disabled])").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host._selectedType = btn.getAttribute("data-gpu-type");
        host._step = 2;
        syncGpuSteps(host);
        paintGpuCompare(host);
      });
    });
  }

  function paintGpuCompare(host) {
    host._step = 2;
    syncGpuSteps(host);
    var body = document.getElementById("gd-gpu-body");
    if (!body) return;
    var type = host._selectedType;
    var sortMode = host._offerSort || "cheapest";
    var offers = filteredOffers(host).filter(function (o) {
      return o.gpuType === type && o.pricePerHour > 0;
    });

    function stockScore(o) {
      var s = String(o.stockStatus || "").toLowerCase();
      if (s.indexOf("unavail") >= 0) return 0;
      if (s.indexOf("limited") >= 0 || s.indexOf("low") >= 0) return 1;
      return 2;
    }

    offers = offers.slice().sort(function (a, b) {
      if (sortMode === "available") return stockScore(b) - stockScore(a) || a.pricePerHour - b.pricePerHour;
      if (sortMode === "value") {
        var va = a.pricePerHour / Math.max(1, stockScore(a));
        var vb = b.pricePerHour / Math.max(1, stockScore(b));
        return va - vb;
      }
      return a.pricePerHour - b.pricePerHour;
    });

    var pretty =
      {
        B300_262GB: "B300 262GB",
        B200_180GB: "B200 180GB",
        H200_141GB: "H200 141GB",
        H100_80GB: "H100 80GB",
        A100_80GB: "A100 80GB",
        A100_40GB: "A100 40GB",
        A6000_48GB: "A6000 48GB",
        L40S_48GB: "L40S 48GB",
        RTX6000Ada_48GB: "RTX 6000 Ada 48GB",
        RTX4090_24GB: "RTX 4090 24GB",
      }[type] || String(type || "").replace(/_/g, " ");

    function providerUrl(provider) {
      var p = String(provider || "").toLowerCase();
      if (p.indexOf("runpod") >= 0) return "https://www.runpod.io/console/gpu-cloud";
      if (p.indexOf("lambda") >= 0) return "https://cloud.lambdalabs.com/";
      if (p.indexOf("vast") >= 0) return "https://vast.ai/";
      if (p.indexOf("coreweave") >= 0) return "https://www.coreweave.com/";
      if (p.indexOf("nebius") >= 0) return "https://nebius.com/";
      if (p.indexOf("hyperstack") >= 0) return "https://www.hyperstack.cloud/";
      if (p.indexOf("datacrunch") >= 0) return "https://datacrunch.io/";
      if (p.indexOf("tensordock") >= 0) return "https://tensordock.com/";
      return host._marketplace || PRIME_GPUS;
    }

    function stockLabel(o) {
      var s = String(o.stockStatus || "").toLowerCase();
      if (s.indexOf("unavail") >= 0) return "Unavailable";
      if (s.indexOf("limited") >= 0 || s.indexOf("low") >= 0) return "Limited";
      if (!s || s === "unknown") return "Quote";
      return "Available";
    }

    body.innerHTML =
      '<div class="gd-gpu-compare-bar">' +
      "<div><strong>Find compute</strong> — " +
      escapeHtml(pretty) +
      " offers across providers</div>" +
      '<button type="button" class="gd-gpu-back" id="gd-gpu-back">← Choose GPU</button>' +
      "</div>" +
      '<div class="gd-gpu-sort-row">' +
      '<button type="button" data-sort="cheapest"' +
      (sortMode === "cheapest" ? ' class="is-active"' : "") +
      ">Cheapest</button>" +
      '<button type="button" data-sort="available"' +
      (sortMode === "available" ? ' class="is-active"' : "") +
      ">Most available</button>" +
      '<button type="button" data-sort="value"' +
      (sortMode === "value" ? ' class="is-active"' : "") +
      ">Best value</button></div>" +
      (offers.length
        ? '<div class="gd-gpu-offer-list">' +
          offers
            .map(function (o) {
              return (
                '<article class="gd-gpu-offer-card" data-offer-id="' +
                escapeHtml(o.id) +
                '">' +
                '<div class="gd-gpu-offer-top">' +
                "<div>" +
                '<div class="gd-gpu-offer-title">' +
                escapeHtml(pretty) +
                " · " +
                escapeHtml(providerLabel(o.provider)) +
                "</div>" +
                '<div class="gd-gpu-offer-badges">' +
                '<span class="gd-gpu-badge">' +
                escapeHtml(stockLabel(o)) +
                "</span>" +
                '<span class="gd-gpu-badge">' +
                escapeHtml(regionLabel(o.region)) +
                "</span></div></div>" +
                '<div class="gd-gpu-offer-right">' +
                '<div class="gd-gpu-offer-price"><span>' +
                fmtGpuPrice(o.pricePerHour) +
                '</span><small>usd/hr</small></div></div></div>' +
                '<div class="gd-gpu-offer-actions">' +
                '<a class="gd-btn gd-btn-primary gd-gpu-view-offer" href="' +
                escapeHtml(providerUrl(o.provider)) +
                '" target="_blank" rel="noopener noreferrer">View offer →</a>' +
                '<button type="button" class="gd-btn gd-btn-ghost gd-gpu-quote">Save quote</button>' +
                "</div></article>"
              );
            })
            .join("") +
          "</div>" +
          '<p class="gd-gpu-honest-note">Olora aggregates GPU pricing. View offer opens the provider — we do not pretend to provision capacity we cannot yet.</p>'
        : '<div class="gd-gpu-empty">No offers available for this GPU right now.</div>');

    var back = document.getElementById("gd-gpu-back");
    if (back) {
      back.addEventListener("click", function () {
        paintGpuChoose(host);
      });
    }

    body.querySelectorAll("[data-sort]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host._offerSort = btn.getAttribute("data-sort");
        paintGpuCompare(host);
      });
    });

    body.querySelectorAll(".gd-gpu-quote").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".gd-gpu-offer-card");
        var id = card && card.getAttribute("data-offer-id");
        var offer = (host._offers || []).find(function (o) {
          return o.id === id;
        });
        if (!offer) return;
        try {
          var hist = JSON.parse(localStorage.getItem("gd-billing-history") || "[]");
          if (!Array.isArray(hist)) hist = [];
          hist.unshift({
            id: "quote_" + Date.now().toString(36),
            date: new Date().toISOString(),
            kind: "gpu_quote",
            description: pretty + " · " + providerLabel(offer.provider),
            amount: fmtGpuPrice(offer.pricePerHour) + "/hr",
          });
          localStorage.setItem("gd-billing-history", JSON.stringify(hist.slice(0, 200)));
          toast("Quote saved to Activity");
        } catch (e) {}
      });
    });
  }

  function paintGpuOffers(host) {
    if (host._step === 2) paintGpuCompare(host);
    else paintGpuChoose(host);
  }

  function getGpuSshKeys() {
    try {
      return JSON.parse(localStorage.getItem("gd-gpu-ssh-keys") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveGpuSshKey(key) {
    var list = getGpuSshKeys();
    list.unshift(key);
    localStorage.setItem("gd-gpu-ssh-keys", JSON.stringify(list.slice(0, 12)));
  }

  function rentGpuOffer(offer, host) {
    var pretty =
      {
        B300_262GB: "B300 262GB",
        B200_180GB: "B200 180GB",
        H200_141GB: "H200 141GB",
        H100_80GB: "H100 80GB",
        A100_80GB: "A100 80GB",
        A100_40GB: "A100 40GB",
        A6000_48GB: "A6000 48GB",
        L40S_48GB: "L40S 48GB",
        RTX6000Ada_48GB: "RTX 6000 Ada 48GB",
        RTX4090_24GB: "RTX 4090 24GB",
      }[offer.gpuType] || String(offer.label || offer.gpuType).replace(/_/g, " ");

    var defaultName = "gradient-" + String(offer.gpuType || "gpu").toLowerCase().replace(/_/g, "-");
    var diskDefault = 500;
    var cpu = Number(offer.vcpu || 0);
    var mem = Number(offer.memoryGb || 0);
    var gpuPrice = Number(offer.pricePerHour || 0);
    var diskRate = 0.0001; // approx /GB/hr display parity
    var keys = getGpuSshKeys();
    if (!keys.length) {
      keys = [{ id: "default", name: "My SSH Key", publicKey: "" }];
    }

    openModal(
      "Customize Deployment",
      '<div class="gd-gpu-checkout" id="gd-gpu-checkout">' +
        '<div class="gd-gpu-checkout-main">' +
        '<div class="gd-gpu-checkout-offer">' +
        '<div class="gd-gpu-checkout-offer-title">' +
        escapeHtml(pretty + " × " + offer.gpuCount) +
        "</div>" +
        '<div class="gd-gpu-offer-badges">' +
        '<span class="gd-gpu-badge">' +
        escapeHtml(offer.socket || "PCIe") +
        "</span>" +
        '<span class="gd-gpu-badge is-secure">secure_cloud</span>' +
        '<span class="gd-gpu-badge">' +
        escapeHtml(providerLabel(offer.provider)) +
        "</span>" +
        '<span class="gd-gpu-badge">' +
        escapeHtml(regionLabel(offer.region)) +
        "</span></div></div>" +
        '<div class="gd-field"><label class="gd-label" for="gd-gpu-name">Name</label>' +
        '<input class="gd-input" id="gd-gpu-name" placeholder="Enter GPU name..." maxlength="50" value="' +
        escapeHtml(defaultName) +
        '"/></div>' +
        '<div class="gd-field"><label class="gd-label" for="gd-gpu-image">Image</label>' +
        '<select class="gd-input" id="gd-gpu-image">' +
        '<option value="ubuntu_22_cuda_12" selected>Ubuntu 22 · CUDA 12</option>' +
        '<option value="ubuntu_22_cuda_12_pytorch">Ubuntu 22 · CUDA 12 · PyTorch</option>' +
        '<option value="ubuntu_24_cuda_12">Ubuntu 24 · CUDA 12</option>' +
        "</select></div>" +
        '<div class="gd-field"><label class="gd-label" for="gd-gpu-ssh">SSH Key</label>' +
        '<select class="gd-input" id="gd-gpu-ssh">' +
        keys
          .map(function (k, i) {
            return (
              '<option value="' +
              escapeHtml(k.id || String(i)) +
              '">' +
              escapeHtml(k.name || "My SSH Key") +
              "</option>"
            );
          })
          .join("") +
        '<option value="__new__">Add New Public Key…</option></select>' +
        '<button type="button" class="gd-gpu-linkish" id="gd-gpu-ssh-help">How to generate SSH key</button></div>' +
        '<div class="gd-gpu-ssh-new" id="gd-gpu-ssh-new" hidden>' +
        '<p class="gd-gpu-muted">Upload your own SSH public key to use with deployed machines</p>' +
        '<div class="gd-field"><label class="gd-label" for="gd-gpu-ssh-name">Name <span class="gd-req">*</span></label>' +
        '<input class="gd-input" id="gd-gpu-ssh-name" placeholder="My SSH Key" maxlength="50"/></div>' +
        '<div class="gd-field"><label class="gd-label" for="gd-gpu-ssh-pub">Public key <span class="gd-req">*</span></label>' +
        '<textarea class="gd-input gd-gpu-ssh-textarea" id="gd-gpu-ssh-pub" rows="3" placeholder="ssh-ed25519 AAAA… comment"></textarea></div>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-gpu-ssh-save">Save key</button></div>' +
        '<div class="gd-gpu-toggle-row">' +
        "<div><strong>Spot Instance</strong>" +
        '<p class="gd-gpu-muted">Spot compute offers lower prices but can be terminated at any time by the provider</p></div>' +
        '<label class="gd-gpu-switch"><input type="checkbox" id="gd-gpu-spot"/><span></span></label></div>' +
        '<div class="gd-gpu-toggle-row">' +
        "<div><strong>Team SSH Access</strong>" +
        '<p class="gd-gpu-muted">All team members will have SSH access</p></div>' +
        '<label class="gd-gpu-switch"><input type="checkbox" id="gd-gpu-team-ssh"/><span></span></label></div>' +
        '<div class="gd-gpu-checkout-specs">' +
        '<div class="gd-gpu-spec-edit"><label>CPU <span>(per node)</span></label>' +
        '<div class="gd-gpu-spec-box" id="gd-gpu-cpu-box">' +
        escapeHtml(String(cpu || "—")) +
        " CPU</div></div>" +
        '<div class="gd-gpu-spec-edit"><label>Memory <span>(per node)</span></label>' +
        '<div class="gd-gpu-spec-box" id="gd-gpu-mem-box">' +
        escapeHtml(String(mem || "—")) +
        " GB</div></div>" +
        '<div class="gd-gpu-spec-edit"><label for="gd-gpu-disk">Disk size <span>(per node)</span></label>' +
        '<div class="gd-gpu-disk-row"><input class="gd-input" id="gd-gpu-disk" type="number" min="50" max="4000" step="10" value="' +
        diskDefault +
        '"/><span>GB</span></div>' +
        '<div class="gd-gpu-spec-hint">Fixed for VM deployments</div></div></div>' +
        '<div class="gd-gpu-shared-disk">' +
        "<strong>Shared Filesystem Configuration</strong>" +
        '<p class="gd-gpu-muted">You can attach existing disks to this cluster</p>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-gpu-disks" disabled>Existing disks</button></div>' +
        "</div>" +
        '<aside class="gd-gpu-checkout-side">' +
        '<div class="gd-gpu-price-card">' +
        '<div class="gd-gpu-price-row"><span>Spin up time</span><strong>&lt; 1 min</strong></div>' +
        '<div class="gd-gpu-price-row"><span>GPU</span><strong id="gd-gpu-line-gpu">' +
        fmtGpuPrice(gpuPrice) +
        "</strong></div>" +
        '<div class="gd-gpu-price-row"><span>Memory</span><strong id="gd-gpu-line-mem">$0.00</strong></div>' +
        '<div class="gd-gpu-price-row"><span>CPU</span><strong id="gd-gpu-line-cpu">$0.00</strong></div>' +
        '<div class="gd-gpu-price-row"><span>Disk</span><strong id="gd-gpu-line-disk">$0.00</strong></div>' +
        '<div class="gd-gpu-price-total"><span>Total cluster</span><strong id="gd-gpu-line-total">' +
        fmtGpuPrice(gpuPrice) +
        ' <small>/ hr</small></strong></div>' +
        '<p class="gd-gpu-muted" id="gd-gpu-per-gpu">Per GPU total: ' +
        fmtGpuPrice(gpuPrice / Math.max(1, offer.gpuCount)) +
        " / hr</p>" +
        '<button type="button" class="gd-btn gd-btn-primary gd-gpu-deploy-confirm" id="gd-gpu-provision">Deploy GPU</button>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-gpu-cancel">Cancel</button>' +
        "</div></aside></div>"
    );

    var root = document.getElementById("gd-overlay-root");
    var modal = root && root.querySelector(".gd-modal");
    if (modal) modal.classList.add("gd-modal-wide", "gd-modal-gpu-checkout");

    function recalc() {
      var diskEl = document.getElementById("gd-gpu-disk");
      var disk = Number((diskEl && diskEl.value) || diskDefault);
      var diskCost = disk * diskRate;
      var total = gpuPrice + diskCost;
      var spot = document.getElementById("gd-gpu-spot");
      if (spot && spot.checked) total *= 0.7;
      var lineDisk = document.getElementById("gd-gpu-line-disk");
      var lineTotal = document.getElementById("gd-gpu-line-total");
      var per = document.getElementById("gd-gpu-per-gpu");
      if (lineDisk) lineDisk.textContent = fmtGpuPrice(diskCost);
      if (lineTotal)
        lineTotal.innerHTML = fmtGpuPrice(total) + " <small>/ hr</small>";
      if (per)
        per.textContent =
          "Per GPU total: " + fmtGpuPrice(total / Math.max(1, offer.gpuCount)) + " / hr";
    }

    var diskInput = document.getElementById("gd-gpu-disk");
    if (diskInput) diskInput.addEventListener("input", recalc);
    var spot = document.getElementById("gd-gpu-spot");
    if (spot) spot.addEventListener("change", recalc);
    recalc();

    document.getElementById("gd-gpu-cancel").onclick = closeModal;

    var sshSelect = document.getElementById("gd-gpu-ssh");
    var sshNew = document.getElementById("gd-gpu-ssh-new");
    if (sshSelect) {
      sshSelect.addEventListener("change", function () {
        if (sshNew) sshNew.hidden = sshSelect.value !== "__new__";
      });
    }

    var help = document.getElementById("gd-gpu-ssh-help");
    if (help) {
      help.onclick = function () {
        openModal(
          "How to generate SSH key",
          '<div class="gd-gpu-ssh-guide">' +
            "<p>Generate a dedicated key for Frontier compute:</p>" +
            '<pre class="gd-gpu-code">ssh-keygen -t ed25519 -C "gradient" -f ~/.ssh/gradient_ed25519</pre>' +
            "<p>Add it to your SSH agent:</p>" +
            '<pre class="gd-gpu-code">eval "$(ssh-agent -s)" && ssh-add ~/.ssh/gradient_ed25519</pre>' +
            '<p class="gd-gpu-muted">Then paste the contents of <code>~/.ssh/gradient_ed25519.pub</code> into Add New Public Key.</p>' +
            '<div class="gd-actions"><button type="button" class="gd-btn gd-btn-primary" id="gd-gpu-ssh-back">Back to deployment</button></div></div>'
        );
        var modal2 = document.querySelector("#gd-overlay-root .gd-modal");
        if (modal2) modal2.classList.add("gd-modal-wide", "gd-modal-gpu-checkout");
        document.getElementById("gd-gpu-ssh-back").onclick = function () {
          rentGpuOffer(offer, host);
        };
      };
    }

    var saveKey = document.getElementById("gd-gpu-ssh-save");
    if (saveKey) {
      saveKey.onclick = function () {
        var name = ((document.getElementById("gd-gpu-ssh-name") || {}).value || "").trim();
        var pub = ((document.getElementById("gd-gpu-ssh-pub") || {}).value || "").trim();
        if (!name) {
          toast("Name is required");
          return;
        }
        if (!/^ssh-(ed25519|rsa|dss) /.test(pub)) {
          toast("Invalid input. Expected a valid SSH public key");
          return;
        }
        var id = "key-" + Date.now();
        saveGpuSshKey({ id: id, name: name, publicKey: pub });
        toast("Public key uploaded successfully");
        rentGpuOffer(offer, host);
      };
    }

    document.getElementById("gd-gpu-provision").onclick = function () {
      var nameEl = document.getElementById("gd-gpu-name");
      var name = ((nameEl && nameEl.value) || "").trim();
      if (!name) {
        toast("Name is required");
        return;
      }
      var image = (document.getElementById("gd-gpu-image") || {}).value || "ubuntu_22_cuda_12";
      var disk = Number((document.getElementById("gd-gpu-disk") || {}).value || diskDefault);
      var spot = !!(document.getElementById("gd-gpu-spot") || {}).checked;
      var diskCost = disk * diskRate;
      var hourly = gpuPrice + diskCost;
      if (spot) hourly *= 0.7;
      var order = {
        name: name,
        image: image,
        diskSize: disk,
        spot: spot,
        teamSsh: !!(document.getElementById("gd-gpu-team-ssh") || {}).checked,
        cloudId: offer.cloudId,
        gpuType: offer.gpuType,
        label: pretty,
        socket: offer.socket,
        gpuCount: offer.gpuCount,
        provider: offer.provider,
        region: offer.region,
        dataCenter: offer.dataCenter,
        country: offer.country,
        vcpu: offer.vcpu,
        memoryGb: offer.memoryGb,
        pricePerHour: hourly,
        gpuPrice: gpuPrice,
        diskCost: diskCost,
        createdAt: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem("gd-gpu-checkout-order", JSON.stringify(order));
      } catch (e) {}
      closeModal();
      location.href = "/lab/dashboard/checkout";
    };
  }

  function getGpuCheckoutOrder() {
    try {
      return JSON.parse(sessionStorage.getItem("gd-gpu-checkout-order") || "null");
    } catch (e) {
      return null;
    }
  }

  function wireGpuCheckoutPage() {
    if (pageKind() !== "checkout") return;
    var main = document.querySelector("main");
    if (!main) return;
    var order = getGpuCheckoutOrder();
    var host = document.getElementById("gd-gpu-checkout-page");
    if (!host) {
      var inner = main.querySelector(".min-w-0") || main;
      host = document.createElement("div");
      host.id = "gd-gpu-checkout-page";
      host.className = "gd-gpu-checkout-page";
      inner.innerHTML = "";
      inner.appendChild(host);
    }

    if (!order) {
      host.innerHTML =
        '<div class="gd-gpu-checkout-empty">' +
        "<h1>Checkout</h1>" +
        "<p>No deployment selected. Choose a GPU offer first.</p>" +
        '<a class="gd-btn gd-btn-primary" href="/lab/dashboard/on-demand-gpus">Browse On-Demand GPUs</a>' +
        "</div>";
      return;
    }

    host.innerHTML =
      '<div class="gd-gpu-checkout-page-grid">' +
      '<section class="gd-gpu-checkout-page-form">' +
      "<h1>Checkout</h1>" +
      '<p class="gd-gpu-checkout-lead">Confirm payment to provision your GPU instance.</p>' +
      '<div class="gd-checkout" id="gd-checkout-root">' +
      '<div class="gd-checkout-card">' +
      '<div class="gd-checkout-card-head"><span>Card</span><span class="gd-checkout-cards" aria-hidden="true">VISA · MC · AMEX</span></div>' +
      '<div class="gd-field"><label class="gd-label">Card number</label><input class="gd-input" id="gd-checkout-number" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"/></div>' +
      '<div class="gd-checkout-row">' +
      '<div class="gd-field"><label class="gd-label">Expiry</label><input class="gd-input" id="gd-checkout-exp" placeholder="MM / YY" maxlength="7"/></div>' +
      '<div class="gd-field"><label class="gd-label">CVC</label><input class="gd-input" id="gd-checkout-cvc" inputmode="numeric" placeholder="123" maxlength="4"/></div>' +
      "</div>" +
      '<div class="gd-field"><label class="gd-label">Name on card</label><input class="gd-input" id="gd-checkout-name" placeholder="Full name"/></div>' +
      "</div>" +
      '<p class="gd-checkout-secure"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Encrypted checkout · Stripe · TLS 1.3</p>' +
      '<div class="gd-actions" style="justify-content:flex-start;gap:0.5rem">' +
      '<a class="gd-btn gd-btn-ghost" href="/lab/dashboard/on-demand-gpus">Back</a>' +
      '<button type="button" class="gd-btn gd-btn-primary" id="gd-checkout-pay">Pay &amp; Deploy · ' +
      escapeHtml(fmtGpuPrice(order.pricePerHour)) +
      "/hr</button>" +
      "</div></div></section>" +
      '<aside class="gd-gpu-checkout-page-summary">' +
      '<div class="gd-gpu-price-card">' +
      "<h2>Order summary</h2>" +
      '<div class="gd-gpu-checkout-offer-title">' +
      escapeHtml(order.label + " × " + order.gpuCount) +
      "</div>" +
      '<div class="gd-gpu-offer-badges">' +
      '<span class="gd-gpu-badge">' +
      escapeHtml(order.socket || "PCIe") +
      "</span>" +
      '<span class="gd-gpu-badge is-secure">secure_cloud</span>' +
      '<span class="gd-gpu-badge">' +
      escapeHtml(providerLabel(order.provider)) +
      "</span></div>" +
      '<div class="gd-gpu-price-row"><span>Instance</span><strong>' +
      escapeHtml(order.name) +
      "</strong></div>" +
      '<div class="gd-gpu-price-row"><span>Image</span><strong>' +
      escapeHtml(String(order.image || "").replace(/_/g, " ")) +
      "</strong></div>" +
      '<div class="gd-gpu-price-row"><span>Disk</span><strong>' +
      escapeHtml(String(order.diskSize)) +
      " GB</strong></div>" +
      '<div class="gd-gpu-price-row"><span>GPU</span><strong>' +
      fmtGpuPrice(order.gpuPrice) +
      "</strong></div>" +
      '<div class="gd-gpu-price-row"><span>Disk</span><strong>' +
      fmtGpuPrice(order.diskCost) +
      "</strong></div>" +
      (order.spot
        ? '<div class="gd-gpu-price-row"><span>Spot</span><strong>Enabled</strong></div>'
        : "") +
      '<div class="gd-gpu-price-total"><span>Total</span><strong>' +
      fmtGpuPrice(order.pricePerHour) +
      " <small>/ hr</small></strong></div>" +
      "</div></aside></div>";

    document.getElementById("gd-checkout-pay").onclick = function () {
      var root = document.getElementById("gd-checkout-root");
      var payBtn = document.getElementById("gd-checkout-pay");
      if (!root || !payBtn) return;
      var num = (document.getElementById("gd-checkout-number").value || "").replace(/\s/g, "");
      if (num.length < 12) {
        toast("Enter a valid card number");
        return;
      }
      payBtn.disabled = true;
      runCheckoutProcessing(
        root,
        ["Authorizing payment…", "Reserving GPU…", "Allocating cluster capacity…"],
        function () {
          renderCapacityFail(root, "gpu");
        }
      );
    };
  }

  function rewriteInstancesPage() {
    var main = document.querySelector("main");
    if (!main) return;
    var host = document.getElementById("gd-gpu-instances");
    if (!host) {
      var inner = main.querySelector(".min-w-0") || main;
      host = document.createElement("div");
      host.id = "gd-gpu-instances";
      host.className = "gd-gpu-market";
      inner.innerHTML = "";
      inner.appendChild(host);
    }

    var list = [];
    try {
      list = JSON.parse(localStorage.getItem("gd-gpu-instances") || "[]");
    } catch (e) {
      list = [];
    }

    host.innerHTML =
      '<div class="gd-gpu-hero">' +
      "<h1>Instances</h1>" +
      "<p>Active GPU machines rented through Olora Cloud. Manage SSH and terminate from here or Prime Intellect.</p>" +
      '<div class="gd-inline-bar" style="margin-top:0.85rem">' +
      '<a class="gd-btn gd-btn-primary" href="/lab/dashboard/on-demand-gpus">Rent a GPU</a>' +
      '<a class="gd-btn gd-btn-ghost" href="' +
      PRIME_GPUS.replace("on-demand-gpus", "instances") +
      '" target="_blank" rel="noopener noreferrer">Open Prime Instances</a>' +
      "</div></div>" +
      (list.length
        ? '<div class="gd-gpu-instance-list">' +
          list
            .map(function (inst) {
              return (
                '<div class="gd-gpu-card">' +
                '<div class="gd-gpu-card-top"><div>' +
                '<div class="gd-gpu-model">' +
                escapeHtml(inst.name || "instance") +
                "</div>" +
                '<div class="gd-gpu-meta">' +
                escapeHtml((inst.gpuCount || 1) + "× " + (inst.gpuType || "GPU")) +
                " · " +
                escapeHtml(inst.provider || "") +
                "</div></div>" +
                '<div class="gd-gpu-price">' +
                escapeHtml(inst.status || "RUNNING") +
                "</div></div>" +
                '<div class="gd-gpu-specs"><span>' +
                fmtGpuPrice(inst.pricePerHour) +
                "</span><span>" +
                escapeHtml(inst.createdAt ? new Date(inst.createdAt).toLocaleString() : "") +
                "</span></div></div>"
              );
            })
            .join("") +
          "</div>"
        : '<div class="gd-gpu-empty">No instances yet. Rent a GPU to get started.</div>');
  }

  async function api(path, opts) {
    var res = await fetch(path, opts);
    if (!res.ok) {
      var err = await res.json().catch(function () {
        return { error: res.statusText };
      });
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }

  async function loadCatalog() {
    try {
      var data = await api("/api/lab/catalog");
      if (data.environments && data.environments.length) {
        state.envs = data.environments.filter(function (e) {
          return !e.userCreated;
        });
        try {
          sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(state.envs));
        } catch (e2) {}
      }
      if (data.models && data.models.length) state.models = data.models;
    } catch (e) {
      console.warn("[gd] catalog", e);
      if (!state.envs || !state.envs.length) {
        state.envs = FALLBACK_ENVS.slice();
      }
    }
  }

  function getStarredIds() {
    try {
      return JSON.parse(localStorage.getItem(STAR_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function setStarredIds(ids) {
    localStorage.setItem(STAR_KEY, JSON.stringify(ids));
  }

  function toggleStar(id) {
    var ids = getStarredIds();
    var i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1);
    else ids.push(id);
    setStarredIds(ids);
  }

  function isStarred(id) {
    return getStarredIds().indexOf(id) >= 0;
  }

  function getUserEnvs() {
    var account = getAccount();
    if (!account || !account.email) return [];
    var key = USER_ENV_KEY + ":" + account.email.toLowerCase();
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveUserEnv(env) {
    var account = getAccount();
    if (!account || !account.email) return;
    var key = USER_ENV_KEY + ":" + account.email.toLowerCase();
    env.userCreated = true;
    env.accountEmail = account.email;
    env.author = account.name || account.email.split("@")[0] || "you";
    var list = getUserEnvs();
    list.unshift(env);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function purgeLegacyUserEnvs() {
    try {
      if (localStorage.getItem(USER_ENV_KEY)) {
        localStorage.removeItem(USER_ENV_KEY);
      }
    } catch (e) {}
  }

  function refreshEvaluationsIfNeeded() {
    if (pageKind() !== "evaluations") return;
    renderEvaluations();
  }

  function refreshTrainingIfNeeded() {
    if (pageKind() !== "training") return;
    renderTraining();
  }

  function styleEvalButtons(root) {
    if (!root) return;
    root.querySelectorAll("button").forEach(function (btn) {
      var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (t.indexOf("Evaluation") >= 0 && btn.querySelector(".lucide-plus")) {
        btn.classList.add("gd-eval-btn-primary");
      }
      if (t === "New Evaluation" || t.indexOf("New Evaluation") >= 0) {
        btn.classList.add("gd-eval-btn-new");
      }
    });
  }

  function openTrainDocs(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    window.open(TRAIN_DOCS, "_blank", "noopener,noreferrer");
  }

  function styleTrainButtons(root) {
    if (!root) return;
    root.querySelectorAll("button").forEach(function (btn) {
      var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (t.indexOf("Learn More") >= 0) {
        btn.classList.add("gd-train-btn-learn");
        btn.setAttribute("data-gd-train-learn", "1");
        btn.onclick = openTrainDocs;
      }
      if (
        (t.indexOf("Training Run") >= 0 || t === "New Run" || t.indexOf("New Run") >= 0) &&
        (btn.querySelector(".lucide-plus") || t === "New Run" || t.indexOf("New Run") >= 0)
      ) {
        btn.classList.add("gd-train-btn-primary");
      }
    });
  }

  function refreshEnvPanelsIfNeeded() {
    if (pageKind() !== "environments") return;
    if (typeof renderEnvPanels === "function") renderEnvPanels();
  }

  function allCatalogEnvs() {
    var base = state.envs.filter(function (e) {
      return !e.userCreated;
    });
    if (!isSignedIn()) return base;
    var user = getUserEnvs();
    var merged = base.slice();
    user.forEach(function (u) {
      if (
        !merged.some(function (e) {
          return e.id === u.id;
        })
      ) {
        merged.push(u);
      }
    });
    return merged;
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var HERO_FONT_CLASSES = [
    "font-semibold",
    "font-medium",
    "font-normal",
    "font-sans",
    "tracking-tight",
    "text-foreground",
    "text-muted-foreground",
    "text-xl",
    "text-sm",
    "text-xs",
    "text-lg",
  ];

  function applyLabFonts() {
    document.documentElement.classList.add("gd-lab-fonts");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.body.classList.add("gd-lab-page", "__variable_0ed695");
    document.body.classList.remove("dark");
  }

  function stripHeroFontClasses(root) {
    if (!root) return;
    root.querySelectorAll("h1, h2, p, button, span").forEach(function (el) {
      HERO_FONT_CLASSES.forEach(function (cls) {
        el.classList.remove(cls);
      });
    });
  }

  function findPageHero(main) {
    if (!main) return null;
    return (
      main.querySelector(".min-w-0.p-4 > .w-full > .w-full.bg-transparent") ||
      main.querySelector(".min-w-0.p-4 .w-full.bg-transparent")
    );
  }

  function stylePageHero(main, heroClass, title, subtitle) {
    var hero = findPageHero(main);
    if (!hero) return null;
    hero.classList.add(heroClass, "gd-lab-hero");
    stripHeroFontClasses(hero);
    var h1 = hero.querySelector("h1");
    var p = hero.querySelector("p");
    if (h1 && title) {
      var span = h1.querySelector("span") || h1;
      span.textContent = title;
    }
    if (p && subtitle) p.textContent = subtitle;
    var divider = hero.parentElement && hero.parentElement.querySelector(".border-b.border-border");
    if (divider) divider.classList.add("gd-eval-hidden-scrape");
    return hero;
  }

  function hashSeed(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function unit(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function evalId() {
    return "eval-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getStoredEvals() {
    var account = getAccount();
    if (!account || !account.email) return [];
    try {
      return JSON.parse(localStorage.getItem(EVALS_KEY) || "[]").filter(function (item) {
        return item.accountEmail === account.email;
      });
    } catch (e) {
      return [];
    }
  }

  function saveStoredEval(run) {
    var account = getAccount();
    if (!account || !account.email) return;
    run.accountEmail = account.email;
    var all = [];
    try {
      all = JSON.parse(localStorage.getItem(EVALS_KEY) || "[]");
    } catch (e) {}
    all = all.filter(function (e) {
      return e.id !== run.id;
    });
    all.unshift(run);
    localStorage.setItem(EVALS_KEY, JSON.stringify(all.slice(0, 100)));
  }

  function mergeEvals(remote, local) {
    var map = {};
    local.forEach(function (e) {
      map[e.id] = e;
    });
    (remote || []).forEach(function (e) {
      map[e.id] = e;
      saveStoredEval(e);
    });
    return Object.keys(map)
      .map(function (id) {
        return map[id];
      })
      .sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }

  function makeEvalTasks(env, n, seedBase) {
    var tasks = [];
    for (var i = 0; i < n; i++) {
      var u = unit(hashSeed(seedBase + ":" + i));
      if (env.category === "Math") {
        var a = 10 + Math.floor(u * 40);
        var b = 10 + Math.floor(unit(hashSeed(seedBase + ":b:" + i)) * 40);
        tasks.push("Solve " + a + " × " + b);
      } else {
        tasks.push((env.exampleTask || env.name) + " (#" + (i + 1) + ")");
      }
    }
    return tasks;
  }

  function runEvalClientSide(input) {
    var env = findEnvById(input.environmentId);
    var model =
      state.models.find(function (m) {
        return m.id === input.modelId;
      }) || { id: input.modelId, displayName: input.modelId };
    if (!env) throw new Error("Environment unavailable");
    var taskCount = Math.min(Math.max(Number(input.taskCount) || 10, 5), 100);
    var tasks = makeEvalTasks(env, taskCount, env.id + ":" + model.id);
    var base = 0.28 + (hashSeed(model.id) % 40) / 100;
    var samples = tasks.map(function (task, i) {
      var r = unit(hashSeed(task + ":" + model.id + ":" + i));
      var reward = r < base + 0.15 ? 1 : r < base + 0.35 ? 0.5 : 0;
      var response;
      if (env.category === "Math" && task.indexOf("Solve") === 0) {
        var nums = task.match(/(\d+)/g) || ["0", "0"];
        response = String(Number(nums[0]) * Number(nums[1]) * (reward > 0 ? 1 : 0) || "incorrect");
      } else {
        response = reward > 0 ? env.exampleAnswer || "—" : "I am not sure.";
      }
      return { task: task, response: String(response), reward: reward, durationMs: 120 + Math.floor(unit(hashSeed("d" + i)) * 800) };
    });
    var avg =
      samples.reduce(function (s, x) {
        return s + x.reward;
      }, 0) / Math.max(samples.length, 1);
    var successRate =
      samples.filter(function (s) {
        return s.reward >= 1;
      }).length / samples.length;
    return {
      id: evalId(),
      environmentId: env.id,
      environmentName: env.name,
      modelId: model.id,
      modelName: model.displayName,
      taskCount: taskCount,
      completed: samples.length,
      averageReward: avg,
      successRate: successRate,
      samples: samples,
      status: "completed",
      createdAt: new Date().toISOString(),
    };
  }

  async function loadEvaluations() {
    if (!isSignedIn()) return [];
    var local = getStoredEvals();
    try {
      var data = await api("/api/lab/evaluations");
      return mergeEvals(data.evaluations || [], local).filter(function (e) {
        var account = getAccount();
        return account && account.email && e.accountEmail === account.email;
      });
    } catch (e) {
      return local;
    }
  }

  var evalEmptyTbodyHtml = null;
  var trainEmptyTbodyHtml = null;
  var trainPollTimer = null;

  function getStoredTrainingRuns() {
    var account = getAccount();
    if (!account || !account.email) return [];
    try {
      return JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]").filter(function (item) {
        return item.accountEmail === account.email;
      });
    } catch (e) {
      return [];
    }
  }

  function saveStoredTrainingRun(run) {
    var account = getAccount();
    if (!account || !account.email || !run || !run.id) return;
    var snapshot = Object.assign({}, run, { accountEmail: account.email });
    var all = [];
    try {
      all = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    } catch (e) {}
    all = all.filter(function (r) {
      return r.id !== snapshot.id;
    });
    all.unshift(snapshot);
    localStorage.setItem(TRAINING_KEY, JSON.stringify(all.slice(0, 100)));
  }

  function isTrainingActive(status) {
    return (
      ["queued", "provisioning", "preparing_environment", "loading_model", "running", "checkpointing"].indexOf(
        status
      ) >= 0
    );
  }

  async function loadTrainingRuns() {
    if (!isSignedIn()) return [];
    var local = getStoredTrainingRuns();
    var refreshed = await Promise.all(
      local.map(async function (run) {
        if (!isTrainingActive(run.status)) return run;
        try {
          var latest = await api("/api/lab/training/" + run.id);
          saveStoredTrainingRun(latest);
          return latest;
        } catch (e) {
          return run;
        }
      })
    );
    return refreshed.sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }

  function trainingStatusLabel(run) {
    if (!run || !run.status) return "—";
    if (run.status === "checkpointing") return "running";
    if (run.status.indexOf("_") >= 0) return run.status.replace(/_/g, " ");
    return run.status;
  }

  function trainingProgressPct(run) {
    var metrics = run.metrics || [];
    var last = metrics[metrics.length - 1];
    var step = last && last.step ? last.step : 0;
    var total = run.totalSteps || 1;
    return Math.min(100, Math.round((step / total) * 100));
  }

  function trainingEvalHtml(run) {
    if (run.beforeAfter) {
      var b = run.beforeAfter.before.averageReward;
      var a = run.beforeAfter.after.averageReward;
      var delta = a - b;
      return (
        '<span class="gd-train-eval">' +
        b.toFixed(2) +
        '<span class="gd-train-eval-arrow">→</span>' +
        '<span class="gd-train-eval-after">' +
        a.toFixed(2) +
        "</span>" +
        (delta > 0
          ? '<span class="gd-train-eval-delta">+' + Math.round((delta / Math.max(b, 0.01)) * 100) + "%</span>"
          : "") +
        "</span>"
      );
    }
    if (run.initialReward != null && isTrainingActive(run.status)) {
      return (
        '<span class="gd-train-eval-pending">baseline ' + run.initialReward.toFixed(2) + "</span>"
      );
    }
    return '<span class="gd-train-eval-muted">—</span>';
  }

  function patchTrainingTableHeader(main) {
    if (!main || main.dataset.gdTrainHeader === "1") return;
    var th = main.querySelector('th[data-resize-column-key="updatedAt"]');
    if (!th) return;
    main.dataset.gdTrainHeader = "1";
    th.querySelectorAll("button").forEach(function (btn) {
      var t = (btn.textContent || "").trim();
      if (t.indexOf("Last Updated") === 0) {
        var svg = btn.querySelector("svg");
        btn.textContent = "Eval Δ";
        if (svg) btn.appendChild(svg);
      }
    });
  }

  function renderTrainingStats(runs) {
    var main = document.querySelector("main");
    if (!main) return;
    var statsGrid = main.querySelector(".grid.divide-x");
    if (!statsGrid) return;
    var values = statsGrid.querySelectorAll(".text-2xl");
    if (values.length < 3) return;
    var active = runs.filter(function (r) {
      return isTrainingActive(r.status);
    }).length;
    var successful = runs.filter(function (r) {
      return r.status === "completed";
    }).length;
    values[0].textContent = String(active);
    values[0].setAttribute("title", String(active));
    values[1].textContent = String(successful);
    values[1].setAttribute("title", String(successful));
    values[2].textContent = String(runs.length);
    values[2].setAttribute("title", String(runs.length));
  }

  function renderTrainingTable(runs) {
    var main = document.querySelector("main");
    if (!main) return;
    patchTrainingTableHeader(main);
    var tbody = main.querySelector("table tbody");
    if (!tbody) return;
    if (!runs.length) {
      if (trainEmptyTbodyHtml) tbody.innerHTML = trainEmptyTbodyHtml;
      styleTrainButtons(main);
      return;
    }
    tbody.innerHTML = runs
      .map(function (run) {
        var meta = getRunMeta(run.id);
        var name =
          (meta.algorithm || "GRPO") +
          " · " +
          (run.environmentName || run.environmentId || "job");
        var status = trainingStatusLabel(run);
        var badgeCls =
          status === "completed" ? "ok" : isTrainingActive(run.status) ? "warn" : "";
        return (
          '<tr class="gd-train-row" data-run-id="' +
          escapeHtml(run.id) +
          '">' +
          '<td class="p-2 align-middle overflow-hidden"></td>' +
          '<td class="p-2 align-middle overflow-hidden">' +
          escapeHtml(name.slice(0, 72)) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden">' +
          escapeHtml(run.environmentName || run.environmentId || "—") +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden">' +
          escapeHtml(run.modelName || run.modelId || "—") +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden"><span class="gd-badge ' +
          badgeCls +
          '">' +
          escapeHtml(status) +
          "</span></td>" +
          '<td class="p-2 align-middle overflow-hidden tabular-nums">' +
          (isTrainingActive(run.status) ? trainingProgressPct(run) + "%" : run.status === "completed" ? "100%" : "—") +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden">' +
          formatEvalDate(run.createdAt) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden">' +
          trainingEvalHtml(run) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden"></td>' +
          "</tr>"
        );
      })
      .join("");
    tbody.querySelectorAll(".gd-train-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-run-id");
        if (!id) return;
        history.replaceState({}, "", "/lab/dashboard/training?run=" + encodeURIComponent(id));
        loadCatalog().then(function () {
          watchRun(id);
        });
      });
    });
  }

  function renderTraining() {
    loadTrainingRuns().then(function (runs) {
      renderTrainingStats(runs);
      renderTrainingTable(runs);
      var hasActive = runs.some(function (r) {
        return isTrainingActive(r.status);
      });
      if (hasActive && !trainPollTimer) {
        trainPollTimer = window.setInterval(function () {
          if (pageKind() !== "training") {
            window.clearInterval(trainPollTimer);
            trainPollTimer = null;
            return;
          }
          renderTraining();
        }, 4000);
      } else if (!hasActive && trainPollTimer) {
        window.clearInterval(trainPollTimer);
        trainPollTimer = null;
      }
    });
  }

  function formatEvalDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso || "—";
    }
  }

  function evalStatusLabel(ev) {
    if (ev.status === "running" || ev.status === "queued") return ev.status;
    return ev.completed >= ev.taskCount ? "completed" : "completed";
  }

  function renderEvalStats(evals) {
    var main = document.querySelector("main");
    if (!main) return;
    var statsGrid = main.querySelector(".grid.divide-x");
    if (!statsGrid) return;
    var values = statsGrid.querySelectorAll(".text-2xl");
    if (values.length < 3) return;
    var active = evals.filter(function (e) {
      return e.status === "running" || e.status === "queued";
    }).length;
    var successful = evals.filter(function (e) {
      return evalStatusLabel(e) === "completed";
    }).length;
    values[0].textContent = String(active);
    values[0].setAttribute("title", String(active));
    values[1].textContent = String(successful);
    values[1].setAttribute("title", String(successful));
    values[2].textContent = String(evals.length);
    values[2].setAttribute("title", String(evals.length));
  }

  function renderEvalTable(evals) {
    var main = document.querySelector("main");
    if (!main) return;
    var tbody = main.querySelector("table tbody");
    if (!tbody) return;
    if (!evals.length) {
      if (evalEmptyTbodyHtml) tbody.innerHTML = evalEmptyTbodyHtml;
      styleEvalButtons(main);
      return;
    }
    tbody.innerHTML = evals
      .map(function (ev) {
        var name = (ev.modelName || ev.modelId) + " · " + (ev.environmentName || ev.environmentId);
        var status = evalStatusLabel(ev);
        var badgeCls = status === "completed" ? "ok" : "warn";
        return (
          '<tr class="gd-eval-row" data-eval-id="' +
          escapeHtml(ev.id) +
          '">' +
          '<td class="p-2 align-middle overflow-hidden"></td>' +
          "<td class=\"p-2 align-middle overflow-hidden\">" +
          escapeHtml(name.slice(0, 64)) +
          "</td>" +
          "<td class=\"p-2 align-middle overflow-hidden\">" +
          escapeHtml(ev.environmentName || ev.environmentId) +
          "</td>" +
          "<td class=\"p-2 align-middle overflow-hidden\">" +
          escapeHtml(ev.modelName || ev.modelId) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden"><span class="gd-badge ' +
          badgeCls +
          '">' +
          status +
          "</span></td>" +
          '<td class="p-2 align-middle overflow-hidden tabular-nums">' +
          (ev.averageReward != null ? ev.averageReward.toFixed(2) : "—") +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden tabular-nums">' +
          (ev.completed || 0) +
          "/" +
          (ev.taskCount || 0) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden">' +
          formatEvalDate(ev.createdAt) +
          "</td>" +
          '<td class="p-2 align-middle overflow-hidden"></td>' +
          "</tr>"
        );
      })
      .join("");
    tbody.querySelectorAll(".gd-eval-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-eval-id");
        var ev = evals.find(function (e) {
          return e.id === id;
        });
        if (ev) openEvalDetailModal(ev);
      });
    });
  }

  function renderEvaluations() {
    loadEvaluations().then(function (evals) {
      renderEvalStats(evals);
      renderEvalTable(evals);
    });
  }

  function evalResultHtml(result) {
    return (
      '<div class="gd-run-panel"><div class="gd-metrics">' +
      '<div class="gd-metric"><span class="k">Avg Reward</span><span class="v">' +
      result.averageReward.toFixed(2) +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Success</span><span class="v">' +
      Math.round(result.successRate * 100) +
      "%</span></div>" +
      '<div class="gd-metric"><span class="k">Tasks</span><span class="v">' +
      result.completed +
      "/" +
      result.taskCount +
      "</span></div></div>" +
      '<table class="gd-table"><thead><tr><th>Task</th><th>Reward</th><th>Output</th></tr></thead><tbody>' +
      (result.samples || [])
        .slice(0, 8)
        .map(function (s) {
          return (
            "<tr><td>" +
            escapeHtml(String(s.task).slice(0, 48)) +
            "</td><td>" +
            s.reward.toFixed(2) +
            "</td><td>" +
            escapeHtml(String(s.response).slice(0, 60)) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function openEvalDetailModal(ev) {
    openModal(
      "Evaluation · " + (ev.environmentName || ev.environmentId),
      '<p class="gd-gate-note" style="margin:0 0 0.85rem">' +
        escapeHtml(ev.modelName || ev.modelId) +
        " · " +
        formatEvalDate(ev.createdAt) +
        "</p>" +
        evalResultHtml(ev) +
        '<div class="gd-actions"><button type="button" class="gd-btn gd-btn-primary" id="gd-eval-detail-close">Close</button></div>'
    );
    document.getElementById("gd-eval-detail-close").onclick = closeModal;
  }

  function filterEnvs(list) {
    var q = (state.envUi.search || "").toLowerCase().trim();
    var cat = state.envUi.category;
    var filtered = list.filter(function (env) {
      if (cat !== "All" && env.category !== cat) return false;
      if (!q) return true;
      var blob = [env.name, env.description, env.category, env.author, (env.tags || []).join(" ")].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    var sort = state.envUi.sort;
    filtered.sort(function (a, b) {
      if (sort === "newest") return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      if (sort === "tasks") return (b.taskCount || 0) - (a.taskCount || 0);
      return (b.stars || 0) - (a.stars || 0);
    });
    return filtered;
  }

  function renderEnvCard(env) {
    var starred = isStarred(env.id);
    return (
      '<article class="gd-env-card" data-id="' +
      escapeHtml(env.id) +
      '" tabindex="0" role="button">' +
      '<div class="gd-env-card-top">' +
      '<span class="gd-badge">' +
      escapeHtml(env.category) +
      "</span>" +
      '<span class="gd-env-diff gd-env-diff-' +
      (env.difficulty || "Intermediate").toLowerCase() +
      '">' +
      escapeHtml(env.difficulty || "Intermediate") +
      "</span>" +
      '<span class="gd-env-star-wrap">' +
      '<button type="button" class="gd-env-star' +
      (starred ? " gd-env-star-on" : "") +
      '" data-star-id="' +
      escapeHtml(env.id) +
      '" aria-label="Star environment">' +
      (starred ? "★" : "☆") +
      "</button>" +
      '<span class="gd-env-star-count">' +
      (env.stars || 0) +
      "</span></span></div>" +
      "<h3>" +
      escapeHtml(env.name) +
      "</h3>" +
      "<p>" +
      escapeHtml(env.description) +
      "</p>" +
      '<div class="gd-env-card-foot">' +
      "<span>@" +
      escapeHtml(env.author || "gradient-labs") +
      "</span>" +
      "<span>·</span>" +
      "<span>" +
      (env.usageCount || 0) +
      " runs</span>" +
      "<span>·</span>" +
      "<span>" +
      (env.taskCount || 0) +
      " tasks</span>" +
      "<span>·</span>" +
      "<span>" +
      formatDate(env.updatedAt) +
      "</span></div></article>"
    );
  }

  function openEnvDetail(env) {
    openModal(
      env.name,
      "<p style=\"color:#d0d3d8;margin:0 0 1rem\">" +
        escapeHtml(env.description) +
        "</p>" +
        "<p><span class=\"gd-badge\">" +
        escapeHtml(env.category) +
        "</span> · Reward: " +
        escapeHtml(env.rewardType) +
        " · " +
        env.taskCount +
        " tasks</p>" +
        (env.dataset
          ? '<p style="margin-top:0.65rem;font-size:0.82rem;color:#787b82"><strong style="color:#9ab4ca">Dataset:</strong> ' +
            escapeHtml(env.dataset.name) +
            " (" +
            formatFileSize(env.dataset.size) +
            ")</p>"
          : "") +
        (env.exampleTask
          ? '<p style="margin-top:0.75rem;font-size:0.82rem;color:#787b82"><strong style="color:#d0d3d8">Example:</strong> ' +
            escapeHtml(env.exampleTask) +
            "</p>"
          : "") +
        '<div class="gd-actions" style="justify-content:flex-start;margin-top:1rem">' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-env-eval">Run Evaluation</button>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-env-train">Start Training</button>' +
        "</div>"
    );
    document.getElementById("gd-env-eval").onclick = function () {
      closeModal();
      guardedOpenEvalModal(env.id);
    };
    document.getElementById("gd-env-train").onclick = function () {
      closeModal();
      guardedOpenTrainModal(env.id);
    };
  }

  function bindEnvGrid(grid) {
    if (!grid) return;
    grid.querySelectorAll(".gd-env-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".gd-env-star")) return;
        var id = card.getAttribute("data-id");
        var env = allCatalogEnvs().find(function (x) {
          return x.id === id;
        });
        if (env) openEnvDetail(env);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    });
    grid.querySelectorAll(".gd-env-star").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var starId = btn.getAttribute("data-star-id");
        requireSignIn(function () {
          toggleStar(starId);
          renderEnvPanels();
        }, "Sign in to save environments to your hub.");
      });
    });
  }

  function renderEnvGridEl(grid, envs, emptyHtml) {
    if (!grid) return;
    if (!envs.length) {
      grid.innerHTML = emptyHtml || '<div class="gd-env-empty">No environments match your filters.</div>';
      return;
    }
    grid.innerHTML = envs.map(renderEnvCard).join("");
    bindEnvGrid(grid);
  }

  function renderEnvPanels() {
    var exploreGrid = document.getElementById("gd-env-grid");
    var starredGrid = document.getElementById("gd-env-grid-starred");
    var mineGrid = document.getElementById("gd-env-grid-mine");
    var catalog = allCatalogEnvs();
    state.envs = catalog;

    renderEnvGridEl(exploreGrid, filterEnvs(catalog.filter(function (e) { return !e.userCreated; })));

    var starredIds = getStarredIds();
    renderEnvGridEl(
      starredGrid,
      filterEnvs(
        catalog.filter(function (e) {
          return !e.userCreated && starredIds.indexOf(e.id) >= 0;
        })
      ),
      '<div class="gd-env-empty">Star environments from Explore to pin them here.</div>'
    );

    var mineEmpty = isSignedIn()
      ? '<div class="gd-env-empty">No custom environments yet. <button type="button" class="gd-link-btn" id="gd-env-empty-create">Create one</button></div>'
      : '<div class="gd-env-empty">Sign in to create and save custom environments. <button type="button" class="gd-link-btn" id="gd-env-empty-signin">Sign in</button></div>';

    renderEnvGridEl(mineGrid, isSignedIn() ? filterEnvs(getUserEnvs()) : [], mineEmpty);

    var createBtn = document.getElementById("gd-env-empty-create");
    if (createBtn) createBtn.onclick = guardedOpenCreateEnvModal;
    var signBtn = document.getElementById("gd-env-empty-signin");
    if (signBtn) {
      signBtn.onclick = function () {
        openSignInModal(function () {
          refreshEnvPanelsIfNeeded();
        });
      };
    }

    document.querySelectorAll(".gd-env-filter").forEach(function (chip) {
      chip.classList.toggle("active", chip.getAttribute("data-cat") === state.envUi.category);
    });
    document.querySelectorAll(".gd-env-sort").forEach(function (chip) {
      chip.classList.toggle("active", chip.getAttribute("data-sort") === state.envUi.sort);
    });
  }

  function switchEnvTab(tabId) {
    state.envUi.tab = tabId;
    document.querySelectorAll('[role="tab"]').forEach(function (tab) {
      var active = tab.id === tabId;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.setAttribute("tabindex", active ? "0" : "-1");
      tab.classList.toggle("gd-env-tab-active", active);
    });
    var explore = document.getElementById("explore-panel");
    var starred = document.getElementById("starred-panel");
    var mine = document.getElementById("my-environments-panel");
    if (explore) explore.hidden = tabId !== "explore";
    if (starred) starred.hidden = tabId !== "starred";
    if (mine) mine.hidden = tabId !== "my-environments";
    renderEnvPanels();
  }

  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function randomHex(len) {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    for (var i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function getDeployments() {
    try {
      return JSON.parse(localStorage.getItem(DEPLOYMENTS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveDeployment(dep) {
    var list = getDeployments();
    list.unshift(dep);
    localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(list));
  }

  function getApiKeys() {
    try {
      return JSON.parse(localStorage.getItem(API_KEYS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveApiKey(key) {
    var list = getApiKeys();
    list.unshift(key);
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(list));
  }

  function setRunMeta(runId, meta) {
    try {
      localStorage.setItem(RUN_META_PREFIX + runId, JSON.stringify(meta));
    } catch (e) {}
  }

  function getRunMeta(runId) {
    try {
      return JSON.parse(localStorage.getItem(RUN_META_PREFIX + runId) || "{}");
    } catch (e) {
      return {};
    }
  }

  function slugifyModel(name) {
    return String(name || "model")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function fakeDownloadCheckpoint(run) {
    var ckpt =
      (run.checkpoints && run.checkpoints.length && run.checkpoints[run.checkpoints.length - 1]) || null;
    var step = ckpt ? ckpt.step : run.totalSteps;
    var fname = slugifyModel(run.modelName) + "-step-" + step + ".safetensors";
    var body =
      "# Olora Cloud demo checkpoint (not real weights)\n" +
      "# run=" +
      run.id +
      "\n# model=" +
      run.modelName +
      "\n# environment=" +
      run.environmentName +
      "\n# step=" +
      step +
      "\n";
    var blob = new Blob([body], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Checkpoint downloaded (demo file)");
  }

  function openDeploySuccessModal(deployment, apiKey) {
    openModal(
      "Deployed to Inference",
      '<p style="color:#d0d3d8;margin:0 0 1rem;font-size:0.875rem;line-height:1.5">Your fine-tuned model is live. Use this API key to call <strong style="color:#f4f4ef">' +
        escapeHtml(deployment.slug) +
        "</strong> — not the base model.</p>" +
        '<div class="gd-field"><label class="gd-label">Endpoint</label><input class="gd-input gd-api-copy" readonly value="' +
        escapeHtml(deployment.endpoint) +
        '"/></div>' +
        '<div class="gd-field"><label class="gd-label">API key</label><input class="gd-input gd-api-copy" id="gd-new-api-key" readonly value="' +
        escapeHtml(apiKey.key) +
        '"/></div>' +
        '<p style="font-size:0.8125rem;color:#787b82;margin:0 0 1rem">Demo key stored in this browser. Copy it now — you won’t see it again.</p>' +
        '<div class="gd-actions" style="justify-content:flex-start">' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-copy-api-key">Copy API key</button>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-goto-inference">Open Inference</button>' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-deploy-done">Done</button>' +
        "</div>"
    );
    document.getElementById("gd-copy-api-key").onclick = function () {
      var el = document.getElementById("gd-new-api-key");
      if (navigator.clipboard && el) {
        navigator.clipboard.writeText(el.value).then(function () {
          toast("API key copied");
        });
      } else if (el) {
        el.select();
        toast("Select and copy the key");
      }
    };
    document.getElementById("gd-goto-inference").onclick = function () {
      closeModal();
      try {
        localStorage.setItem("gd-pipeline-step", "4");
      } catch (e) {}
      location.href =
        "/lab/inference#api-keys&model=" + encodeURIComponent(deployment.slug);
    };
    document.getElementById("gd-deploy-done").onclick = closeModal;
  }

  function openDeployFlow(run) {
    if (!isSignedIn()) {
      guardedOpenDeployFlow(run);
      return;
    }
    if (!canAfford(DEPLOY_COST)) {
      guardedOpenDeployFlow(run);
      return;
    }
    var meta = getRunMeta(run.id);
    var algo = meta.algorithm || "GRPO";
    var bal = getCredits();
    openModal(
      "Deploy to Inference",
      '<div id="gd-deploy-stage">' +
        '<p style="color:#d0d3d8;margin:0 0 1rem;font-size:0.875rem">Publish <strong style="color:#f4f4ef">' +
        escapeHtml(run.modelName) +
        '</strong> fine-tuned on <strong style="color:#f4f4ef">' +
        escapeHtml(run.environmentName) +
        "</strong> (" +
        escapeHtml(algo) +
        ").</p>" +
        '<ul class="gd-deploy-checklist">' +
        "<li>Checkpoint: step " +
        run.totalSteps +
        "</li>" +
        "<li>Deploy cost: " +
        formatMoney(DEPLOY_COST) +
        " (balance: " +
        formatMoney(bal) +
        ")</li>" +
        "<li>Access: dedicated API key tied to your account</li>" +
        "</ul>" +
        '<div class="gd-actions" style="justify-content:flex-start;margin-top:1rem">' +
        '<button type="button" class="gd-btn gd-btn-ghost" id="gd-deploy-cancel">Cancel</button>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-deploy-go">Deploy · ' +
        formatMoney(DEPLOY_COST) +
        "</button>" +
        "</div></div>"
    );
    document.getElementById("gd-deploy-cancel").onclick = closeModal;
    document.getElementById("gd-deploy-go").onclick = function () {
      updatePipeline(3);
      var stage = document.getElementById("gd-deploy-stage");
      if (!stage) return;
      stage.innerHTML =
        '<div class="gd-deploy-progress"><div class="gd-deploy-bar"></div></div>' +
        '<p id="gd-deploy-status" style="margin:0.75rem 0 0;font-size:0.875rem;color:#9ab4ca">Uploading checkpoint…</p>';
      var statuses = [
        "Uploading checkpoint…",
        "Registering model weights…",
        "Provisioning inference endpoint…",
        "Minting API key…",
      ];
      var i = 0;
      var tick = setInterval(function () {
        i += 1;
        if (i < statuses.length) {
          var st = document.getElementById("gd-deploy-status");
          if (st) st.textContent = statuses[i];
        }
      }, 650);
      setTimeout(function () {
        clearInterval(tick);
        if (!deductCredits(DEPLOY_COST, "Deploy to Inference · " + run.modelName)) {
          closeModal();
          openCreditsGateModal(DEPLOY_COST, "Insufficient balance to deploy.");
          return;
        }
        var slug = "you/" + slugifyModel(run.modelName) + "-" + run.id.slice(0, 8);
        var account = getAccount();
        var deployment = {
          id: "dep-" + Date.now(),
          runId: run.id,
          modelName: run.modelName + " (fine-tuned)",
          baseModel: run.modelName,
          envName: run.environmentName,
          algorithm: algo,
          slug: slug,
          endpoint: "https://app.olora.si/api/v1/" + slug,
          deployedAt: new Date().toISOString(),
          checkpointStep: run.totalSteps,
          accountEmail: account && account.email,
        };
        var apiKey = {
          id: "key-" + Date.now(),
          deploymentId: deployment.id,
          key: "gd_live_" + randomHex(32),
          label: deployment.modelName,
          modelSlug: slug,
          createdAt: new Date().toISOString(),
          accountEmail: account && account.email,
        };
        saveDeployment(deployment);
        saveApiKey(apiKey);
        try {
          localStorage.setItem("gd-pipeline-step", "4");
        } catch (e) {}
        closeModal();
        openDeploySuccessModal(deployment, apiKey);
        toast("Deployed · " + formatMoney(DEPLOY_COST) + " deducted · Balance " + formatMoney(getCredits()));
      }, 2800);
    };
  }

  function wireExportPanel(run) {
    if (run.status !== "completed") return;
    var dl = document.getElementById("gd-download-ckpt");
    var dep = document.getElementById("gd-deploy-inference");
    if (dl) {
      dl.onclick = function () {
        updatePipeline(2);
        fakeDownloadCheckpoint(run);
      };
    }
    if (dep) {
      dep.onclick = function () {
        updatePipeline(3);
        guardedOpenDeployFlow(run);
      };
    }
    var inf = document.getElementById("gd-goto-inference-panel");
    if (inf) {
      inf.onclick = function () {
        location.href = "/lab/inference#api-keys";
      };
    }
  }

  function wireCreateDropzone() {
    var zone = document.getElementById("gd-create-dropzone");
    var input = document.getElementById("gd-create-dataset");
    var label = document.getElementById("gd-create-dataset-label");
    if (!zone || !input) return;

    function showFile(file) {
      if (!file || !label) return;
      label.textContent = file.name + " · " + formatFileSize(file.size);
      zone._datasetFile = file;
    }

    zone.addEventListener("click", function () {
      input.click();
    });
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) showFile(input.files[0]);
    });
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("gd-dropzone-active");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("gd-dropzone-active");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("gd-dropzone-active");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        showFile(e.dataTransfer.files[0]);
      }
    });
  }

  function openCreateEnvModal() {
    openModal(
      "Create Environment",
      '<div class="gd-create-layout">' +
        '<div class="gd-create-form">' +
        '<div class="gd-field"><label class="gd-label">Name</label><input class="gd-input" id="gd-create-name" placeholder="My evaluation suite"/></div>' +
        '<div class="gd-field"><label class="gd-label">Description</label><textarea class="gd-input gd-textarea" id="gd-create-desc" rows="3" placeholder="What tasks does this environment cover?"></textarea></div>' +
        '<div class="gd-field"><label class="gd-label">Category</label><select class="gd-select" id="gd-create-cat"><option>Math</option><option>Code</option><option>Software Engineering</option><option>Search</option><option>Tool Use</option><option>Reasoning</option></select></div>' +
        '<div class="gd-field"><label class="gd-label">Reward type</label><input class="gd-input" id="gd-create-reward" placeholder="Correct answer, tests pass, judge score…"/></div>' +
        '<div class="gd-field"><label class="gd-label">Dataset</label>' +
        '<div class="gd-dropzone" id="gd-create-dropzone">' +
        '<input type="file" id="gd-create-dataset" accept=".json,.jsonl,.csv,.txt,.zip,.parquet"/>' +
        '<div class="gd-dropzone-title">Drop a dataset or click to browse</div>' +
        '<div class="gd-dropzone-hint">Prompts, preference pairs, or task files (.jsonl, .csv, .json, .txt, .zip)</div>' +
        '<div class="gd-dropzone-file" id="gd-create-dataset-label"></div>' +
        "</div></div>" +
        '<div class="gd-actions"><button type="button" class="gd-btn gd-btn-ghost" id="gd-create-cancel">Cancel</button><button type="button" class="gd-btn gd-btn-primary" id="gd-create-save">Create</button></div>' +
        "</div>" +
        '<aside class="gd-create-how" aria-label="How it works">' +
        "<h3>How it works in Olora Cloud</h3>" +
        "<ol>" +
        '<li><span class="gd-step-num">1</span><div><strong>Attach your data</strong><span class="gd-step-body">Upload prompts, JSONL tasks, or env configs. This dataset defines what models are tested and trained on.</span></div></li>' +
        '<li><span class="gd-step-num">2</span><div><strong>Set rewards &amp; rules</strong><span class="gd-step-body">Choose how outputs are scored: exact match, unit tests, citations, or an AI judge. Match the reward type above.</span></div></li>' +
        '<li><span class="gd-step-num">3</span><div><strong>Evaluate or train</strong><span class="gd-step-body">Run a quick eval from the environment card, or open Training to pick an algorithm (PPO, GRPO, DPO) and GPU scale.</span></div></li>' +
        '<li><span class="gd-step-num">4</span><div><strong>Track &amp; deploy</strong><span class="gd-step-body">Watch reward curves on Evaluations, compare before/after, then ship the best checkpoint to Inference.</span></div></li>' +
        "</ol></aside></div>"
    );
    var modal = document.querySelector("#gd-overlay-root .gd-modal");
    if (modal) modal.classList.add("gd-modal-wide");

    wireCreateDropzone();

    document.getElementById("gd-create-cancel").onclick = function () {
      if (modal) modal.classList.remove("gd-modal-wide");
      closeModal();
    };
    document.getElementById("gd-create-save").onclick = function () {
      if (!isSignedIn()) {
        toast("Sign in to save custom environments");
        closeModal();
        openSignInModal(function () {
          guardedOpenCreateEnvModal();
        });
        return;
      }
      var name = (document.getElementById("gd-create-name").value || "").trim();
      if (!name) {
        toast("Name is required");
        return;
      }
      var dropzone = document.getElementById("gd-create-dropzone");
      var file = dropzone && dropzone._datasetFile;
      var env = {
        id: "user-env-" + Date.now(),
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: name,
        description: (document.getElementById("gd-create-desc").value || "").trim() || "Custom environment",
        category: document.getElementById("gd-create-cat").value,
        taskCount: file ? Math.max(50, Math.min(5000, Math.round(file.size / 120))) : 50,
        rewardType: (document.getElementById("gd-create-reward").value || "").trim() || "Custom Reward",
        exampleTask: "Sample task for " + name,
        exampleAnswer: "—",
        author: "you",
        stars: 0,
        difficulty: "Intermediate",
        updatedAt: new Date().toISOString().slice(0, 10),
        tags: ["custom"],
        usageCount: 0,
        userCreated: true,
      };
      var account = getAccount();
      if (account && account.email) {
        env.accountEmail = account.email;
        env.author = account.name || account.email.split("@")[0] || "you";
      }
      if (file) {
        env.dataset = {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          attachedAt: new Date().toISOString(),
        };
      }
      saveUserEnv(env);
      if (modal) modal.classList.remove("gd-modal-wide");
      closeModal();
      toast(file ? "Environment created — start Training from My Environments" : "Environment created — find it under My Environments");
      switchEnvTab("my-environments");
    };
  }

  function wireEnvironments() {
    if (pageKind() !== "environments") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdEnv === "1") return;
    main.dataset.gdEnv = "1";
    main.classList.add("gd-env-page");
    purgeLegacyUserEnvs();

    // Brand hero header — mark scraped banner and strip mismatched font utilities
    stylePageHero(main, "gd-env-hero", null, null);

    // Hide skeleton loaders and dead Prime placeholders immediately
    main.querySelectorAll('[class*="animate-pulse"]').forEach(function (el) {
      el.classList.add("gd-env-hidden");
    });
    main.querySelectorAll(".grid").forEach(function (grid) {
      if (grid.querySelector('[class*="animate-pulse"]')) grid.classList.add("gd-env-hidden");
    });
    main.querySelectorAll(".space-y-3, .space-y-8").forEach(function (block) {
      if (block.querySelector('[class*="animate-pulse"]') && !block.querySelector(".gd-env-grid")) {
        block.classList.add("gd-env-hidden");
      }
    });

    // Restyle header buttons
    main.querySelectorAll("button").forEach(function (btn) {
      var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (t.indexOf("Learn More") >= 0) {
        btn.classList.add("gd-env-btn-learn");
        btn.setAttribute("data-gd-learn", "1");
      }
      if (t.indexOf("Create Environment") >= 0) {
        btn.classList.add("gd-env-btn-create");
        btn.setAttribute("data-gd-create", "1");
      }
    });

    document.addEventListener(
      "click",
      function (e) {
        var learn = e.target.closest && e.target.closest("[data-gd-learn]");
        if (learn) {
          e.preventDefault();
          e.stopPropagation();
          window.open(ENV_DOCS, "_blank", "noopener,noreferrer");
          return;
        }
        var create = e.target.closest && e.target.closest("[data-gd-create]");
        if (create) {
          e.preventDefault();
          e.stopPropagation();
          guardedOpenCreateEnvModal();
        }
      },
      true
    );

    // Wire tabs — mark default active tab styling
    document.querySelectorAll('[role="tab"]').forEach(function (tab) {
      if (tab.getAttribute("aria-selected") === "true") tab.classList.add("gd-env-tab-active");
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        switchEnvTab(tab.id);
      });
    });

    // Mount grids inside explore panel
    var explorePanel = document.getElementById("explore-panel");
    if (explorePanel) {
      explorePanel.querySelectorAll('[class*="animate-pulse"]').forEach(function (el) {
        el.closest(".grid") && el.closest(".grid").classList.add("gd-env-hidden");
      });
      explorePanel.querySelectorAll("h2").forEach(function (h) {
        if ((h.textContent || "").trim() === "Community") {
          var block = h.closest(".space-y-4") || h.parentElement;
          if (block) block.classList.add("gd-env-hidden");
        }
      });

      var toolbar = document.createElement("div");
      toolbar.className = "gd-env-toolbar";
      toolbar.innerHTML =
        '<div class="gd-env-filters">' +
        ['All', 'Math', 'Code', 'Software Engineering', 'Search', 'Tool Use', 'Reasoning']
          .map(function (c) {
            return (
              '<button type="button" class="gd-env-filter' +
              (c === "All" ? " active" : "") +
              '" data-cat="' +
              c +
              '">' +
              c +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="gd-env-sorts">' +
        '<button type="button" class="gd-env-sort active" data-sort="popular">Popular</button>' +
        '<button type="button" class="gd-env-sort" data-sort="newest">Newest</button>' +
        '<button type="button" class="gd-env-sort" data-sort="tasks">Most tasks</button>' +
        "</div>";

      var gridWrap = document.createElement("div");
      gridWrap.className = "gd-env-grid-wrap";
      gridWrap.innerHTML = '<div class="gd-env-grid" id="gd-env-grid"></div>';

      explorePanel.appendChild(toolbar);
      explorePanel.appendChild(gridWrap);

      toolbar.querySelectorAll(".gd-env-filter").forEach(function (chip) {
        chip.addEventListener("click", function () {
          state.envUi.category = chip.getAttribute("data-cat");
          renderEnvPanels();
        });
      });
      toolbar.querySelectorAll(".gd-env-sort").forEach(function (chip) {
        chip.addEventListener("click", function () {
          state.envUi.sort = chip.getAttribute("data-sort");
          renderEnvPanels();
        });
      });

      var searchInput = explorePanel.querySelector('input[type="text"]');
      if (searchInput) {
        searchInput.classList.add("gd-env-search");
        searchInput.setAttribute("placeholder", "Search environments, tags, authors…");
        searchInput.addEventListener("input", function () {
          state.envUi.search = searchInput.value;
          renderEnvPanels();
        });
      }
    }

    // Create starred + my-environments panels (not in scrape)
    var panelHost = explorePanel && explorePanel.parentElement;
    if (panelHost && !document.getElementById("starred-panel")) {
      panelHost.insertAdjacentHTML(
        "beforeend",
        '<div id="starred-panel" role="tabpanel" aria-labelledby="starred" hidden><div class="gd-env-grid" id="gd-env-grid-starred"></div></div>' +
          '<div id="my-environments-panel" role="tabpanel" aria-labelledby="my-environments" hidden><div class="gd-env-grid" id="gd-env-grid-mine"></div></div>'
      );
    }

    // Render immediately from fallback, refresh in background
    renderEnvPanels();
    loadCatalog().then(function () {
      renderEnvPanels();
    });
  }

  function modelOptions(selected) {
    return state.models
      .map(function (m) {
        return (
          '<option value="' +
          m.id +
          '"' +
          (m.id === selected ? " selected" : "") +
          ">" +
          m.displayName +
          (m.trainable ? "" : " (eval only)") +
          "</option>"
        );
      })
      .join("");
  }

  function envOptions(selected) {
    return state.envs
      .map(function (e) {
        return (
          '<option value="' +
          e.id +
          '"' +
          (e.id === selected ? " selected" : "") +
          ">" +
          e.name +
          "</option>"
        );
      })
      .join("");
  }

  function findEnvById(envId) {
    return (
      state.envs.find(function (e) {
        return e.id === envId;
      }) ||
      getUserEnvs().find(function (e) {
        return e.id === envId;
      })
    );
  }

  function userEnvPayload(envId) {
    if (String(envId || "").indexOf("user-env-") !== 0) return {};
    var env = findEnvById(envId);
    return env ? { userEnvironment: env } : {};
  }

  function pipelineHtml(activeStep) {
    var steps = [
      { n: 1, label: "Train on compute" },
      { n: 2, label: "Export checkpoint" },
      { n: 3, label: "Deploy to Inference" },
      { n: 4, label: "API key" },
    ];
    return (
      '<div class="gd-pipeline" id="gd-pipeline">' +
      steps
        .map(function (s) {
          var cls = "gd-pipeline-step";
          if (s.n < activeStep) cls += " done";
          else if (s.n === activeStep) cls += " active";
          return (
            '<div class="' +
            cls +
            '"><span class="gd-pipeline-num">' +
            s.n +
            "</span><span>" +
            s.label +
            "</span></div>"
          );
        })
        .join('<span class="gd-pipeline-arrow" aria-hidden="true">→</span>') +
      "</div>"
    );
  }

  function updatePipeline(activeStep) {
    var el = document.getElementById("gd-pipeline");
    if (el) el.outerHTML = pipelineHtml(activeStep);
  }

  function openEvalModal(envId) {
    var bal = getCredits();
    openModal(
      "New Evaluation",
      '<p class="gd-gate-note" style="margin:0 0 0.85rem">Compute cost: ' +
        formatMoney(EVAL_COST) +
        " · Balance: " +
        formatMoney(bal) +
        "</p>" +
        '<div class="gd-field"><label class="gd-label">Environment</label><select class="gd-select" id="gd-eval-env">' +
        envOptions(envId) +
        '</select></div>' +
        '<div class="gd-field"><label class="gd-label">Model</label><select class="gd-select" id="gd-eval-model">' +
        modelOptions() +
        '</select></div>' +
        '<div class="gd-field"><label class="gd-label">Tasks</label><select class="gd-select" id="gd-eval-tasks"><option value="10">10 (fast)</option><option value="25" selected>25</option><option value="50">50</option></select></div>' +
        '<div class="gd-actions"><button type="button" class="gd-btn gd-btn-ghost" id="gd-eval-cancel">Cancel</button><button type="button" class="gd-btn gd-btn-primary" id="gd-eval-go">Run Evaluation · ' +
        formatMoney(EVAL_COST) +
        "</button></div>" +
        '<div id="gd-eval-result"></div>'
    );
    document.getElementById("gd-eval-cancel").onclick = closeModal;
    document.getElementById("gd-eval-go").onclick = async function () {
      if (!canAfford(EVAL_COST)) {
        closeModal();
        openCreditsGateModal(EVAL_COST, "Evaluations require compute credits.");
        return;
      }
      if (!deductCredits(EVAL_COST, "Evaluation run")) {
        closeModal();
        openCreditsGateModal(EVAL_COST, "Insufficient balance for evaluation.");
        return;
      }
      var btn = document.getElementById("gd-eval-go");
      btn.disabled = true;
      btn.textContent = "Running…";
      try {
        var payload = Object.assign(
          {
            environmentId: document.getElementById("gd-eval-env").value,
            modelId: document.getElementById("gd-eval-model").value,
            taskCount: Number(document.getElementById("gd-eval-tasks").value),
          },
          userEnvPayload(document.getElementById("gd-eval-env").value)
        );
        var result;
        try {
          result = await api("/api/lab/evaluations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (apiErr) {
          result = runEvalClientSide(payload);
        }
        if (!result.status) result.status = "completed";
        saveStoredEval(result);
        var box = document.getElementById("gd-eval-result");
        box.innerHTML =
          evalResultHtml(result) +
          '<div class="gd-actions" style="margin-top:0.75rem"><button type="button" class="gd-btn gd-btn-primary" id="gd-eval-done">Done</button></div>';
        document.getElementById("gd-eval-done").onclick = function () {
          closeModal();
        };
        renderEvaluations();
        toast("Evaluation complete");
      } catch (err) {
        toast(err.message || "Evaluation failed");
      } finally {
        btn.disabled = false;
        btn.textContent = "Run Evaluation · " + formatMoney(EVAL_COST);
      }
    };
  }

  function openTrainModal(envId) {
    var bal = getCredits();
    openModal(
      "New Training Run",
      '<p class="gd-gate-note" style="margin:0 0 0.85rem">Pay before compute. Max budget ≥ $25 credits your balance when training completes (demo).</p>' +
        '<div class="gd-field"><label class="gd-label">Base model</label><select class="gd-select" id="gd-train-model">' +
        state.models
          .filter(function (m) {
            return m.trainable;
          })
          .map(function (m) {
            return '<option value="' + m.id + '">' + m.displayName + "</option>";
          })
          .join("") +
        '</select></div>' +
        '<div class="gd-field"><label class="gd-label">Environment / Job</label><select class="gd-select" id="gd-train-env">' +
        envOptions(envId) +
        '</select></div>' +
        '<div class="gd-field"><label class="gd-label">Algorithm</label><select class="gd-select" id="gd-train-algo"><option value="GRPO" selected>GRPO</option><option value="PPO">PPO</option><option value="DPO">DPO</option></select></div>' +
        '<div class="gd-field"><label class="gd-label">Preset</label><select class="gd-select" id="gd-train-preset"><option value="fast" selected>Fast — demo run (~30s)</option><option value="standard">Standard</option><option value="extended">Extended</option></select></div>' +
        '<div class="gd-field"><label class="gd-label">Max budget (USD)</label><input class="gd-input" id="gd-train-budget" type="number" min="1" value="25"/></div>' +
        '<p style="font-size:0.8125rem;color:#787b82;margin:0 0 0.5rem">Balance: ' +
        formatMoney(bal) +
        " · Need balance ≥ budget, or budget ≥ $25 for demo training credit.</p>" +
        '<div class="gd-actions"><button type="button" class="gd-btn gd-btn-ghost" id="gd-train-cancel">Cancel</button><button type="button" class="gd-btn gd-btn-primary" id="gd-train-go">Start Training</button></div>'
    );
    document.getElementById("gd-train-cancel").onclick = closeModal;
    document.getElementById("gd-train-go").onclick = async function () {
      var maxBudget = Number(document.getElementById("gd-train-budget").value) || 25;
      if (!canStartTraining(maxBudget)) {
        closeModal();
        openCreditsGateModal(
          maxBudget,
          "Training requires balance ≥ " +
            formatMoney(maxBudget) +
            ", or set max budget ≥ $25 for demo training budget credit."
        );
        return;
      }
      var btn = document.getElementById("gd-train-go");
      btn.disabled = true;
      try {
        if (canAfford(maxBudget)) {
          if (!deductCredits(maxBudget, "Training run · max budget " + formatMoney(maxBudget))) {
            toast("Insufficient balance");
            btn.disabled = false;
            return;
          }
        } else if (trainingBudgetAllowed(maxBudget)) {
          toast("Demo: " + formatMoney(maxBudget) + " training budget will credit on completion");
        }
        try {
          localStorage.removeItem("gd-pipeline-step");
        } catch (e) {}
        var preset = document.getElementById("gd-train-preset").value;
        var envIdVal = document.getElementById("gd-train-env").value;
        var run = await api("/api/lab/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.assign(
              {
                modelId: document.getElementById("gd-train-model").value,
                environmentId: envIdVal,
                preset: preset,
                maxBudget: maxBudget,
              },
              userEnvPayload(envIdVal)
            )
          ),
        });
        setRunMeta(run.id, {
          algorithm: document.getElementById("gd-train-algo").value,
          prepaidBudget: canAfford(maxBudget) ? maxBudget : 0,
        });
        saveStoredTrainingRun(run);
        closeModal();
        location.href = "/lab/dashboard/training?run=" + encodeURIComponent(run.id);
      } catch (err) {
        toast(err.message || "Could not start training");
        btn.disabled = false;
      }
    };
  }

  function renderRunPanel(run) {
    var host = document.getElementById("gd-run-host");
    if (!host) return;
    var metrics = run.metrics || [];
    var last = metrics[metrics.length - 1] || {};
    var rewardSeries = metrics.map(function (m) {
      return m.reward;
    });
    var w = 560;
    var h = 140;
    var pad = 8;
    var pathD = "";
    if (rewardSeries.length > 1) {
      rewardSeries.forEach(function (v, i) {
        var x = pad + (i / (rewardSeries.length - 1)) * (w - pad * 2);
        var y = h - pad - v * (h - pad * 2);
        pathD += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      });
    }
    var beforeAfter = "";
    if (run.beforeAfter) {
      beforeAfter =
        '<h3 style="margin:1rem 0 0.5rem;font-size:0.95rem">Before vs After</h3>' +
        '<table class="gd-table"><thead><tr><th>Metric</th><th>Before</th><th>After</th></tr></thead><tbody>' +
        "<tr><td>Avg Reward</td><td>" +
        run.beforeAfter.before.averageReward.toFixed(2) +
        "</td><td>" +
        run.beforeAfter.after.averageReward.toFixed(2) +
        "</td></tr>" +
        "<tr><td>Success Rate</td><td>" +
        Math.round(run.beforeAfter.before.successRate * 100) +
        "%</td><td>" +
        Math.round(run.beforeAfter.after.successRate * 100) +
        "%</td></tr>" +
        "</tbody></table>";
    }
    var checkpoints = (run.checkpoints || [])
      .map(function (c) {
        return (
          "<tr><td>" +
          c.step +
          "</td><td>" +
          c.reward.toFixed(2) +
          '</td><td><span class="gd-badge ok">' +
          c.id +
          "</span></td></tr>"
        );
      })
      .join("");

    host.innerHTML =
      '<div class="gd-run-panel">' +
      "<div style=\"display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap\">" +
      "<div><strong>" +
      (run.modelName || run.modelId) +
      "</strong> on <strong>" +
      (run.environmentName || run.environmentId) +
      '</strong><div style="margin-top:0.35rem"><span class="gd-badge">' +
      run.status +
      "</span> · provider: " +
      run.provider +
      "</div></div>" +
      (run.status === "running" || run.status === "queued" || run.status === "provisioning"
        ? '<button type="button" class="gd-btn gd-btn-ghost" id="gd-stop-run">Stop Training</button>'
        : "") +
      "</div>" +
      '<div class="gd-metrics">' +
      '<div class="gd-metric"><span class="k">Step</span><span class="v">' +
      (last.step || 0) +
      " / " +
      run.totalSteps +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Avg Reward</span><span class="v">' +
      (last.reward != null ? last.reward.toFixed(2) : "—") +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Initial</span><span class="v">' +
      (run.initialReward != null ? run.initialReward.toFixed(2) : "—") +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Improvement</span><span class="v">' +
      (run.improvement != null ? "+" + Math.round(run.improvement * 100) + "%" : "—") +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Loss</span><span class="v">' +
      (last.loss != null ? last.loss.toFixed(3) : "—") +
      "</span></div>" +
      '<div class="gd-metric"><span class="k">Est. Cost</span><span class="v">$' +
      (run.estimatedCost != null ? run.estimatedCost.toFixed(2) : "0.00") +
      "</span></div>" +
      "</div>" +
      '<svg class="gd-chart" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="none"><path d="' +
      pathD +
      '" fill="none" stroke="#9AB4CA" stroke-width="2"/></svg>' +
      '<div class="gd-log" id="gd-run-log">' +
      (run.logs || []).slice(-40).join("\n") +
      "</div>" +
      (checkpoints
        ? '<h3 style="margin:1rem 0 0.5rem;font-size:0.95rem">Checkpoints</h3><table class="gd-table"><thead><tr><th>Step</th><th>Reward</th><th>ID</th></tr></thead><tbody>' +
          checkpoints +
          "</tbody></table>"
        : "") +
      beforeAfter +
      (run.status === "completed"
        ? '<div class="gd-export-panel">' +
          "<h3>Export &amp; Deploy</h3>" +
          "<p>Training finished — new weights are ready. Export the checkpoint or deploy your fine-tuned model to Inference.</p>" +
          '<div class="gd-export-actions">' +
          '<button type="button" class="gd-btn gd-btn-ghost" id="gd-download-ckpt">Download checkpoint</button>' +
          '<button type="button" class="gd-btn gd-btn-primary" id="gd-deploy-inference">Deploy to Inference</button>' +
          '<button type="button" class="gd-btn gd-btn-ghost" id="gd-goto-inference-panel">View API keys</button>' +
          "</div></div>"
        : "") +
      "</div>";

    wireExportPanel(run);

    var pipelineStep = 1;
    if (run.status === "running" || run.status === "queued" || run.status === "provisioning") {
      pipelineStep = 1;
    } else if (run.status === "completed") {
      pipelineStep = 2;
      try {
        var saved = Number(localStorage.getItem("gd-pipeline-step") || "0");
        if (saved >= 3) pipelineStep = saved;
      } catch (e) {}
    }
    updatePipeline(pipelineStep);

    var stop = document.getElementById("gd-stop-run");
    if (stop) {
      stop.onclick = async function () {
        try {
          await api("/api/lab/training/" + run.id + "/cancel", { method: "POST" });
          var cancelled = await api("/api/lab/training/" + run.id);
          saveStoredTrainingRun(cancelled);
          renderTrainingIfNeeded();
          toast("Training cancelled");
        } catch (err) {
          toast(err.message);
        }
      };
    }
  }

  function watchRun(runId) {
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
    api("/api/lab/training/" + runId)
      .then(function (run) {
        state.currentRun = run;
        saveStoredTrainingRun(run);
        renderRunPanel(run);
        renderTrainingIfNeeded();
        if (run.status === "completed") creditTrainingBudget(run);
      })
      .catch(function () {});

    var es = new EventSource("/api/lab/training/" + runId + "/stream");
    state.eventSource = es;
    es.onmessage = function (ev) {
      try {
        var run = JSON.parse(ev.data);
        state.currentRun = run;
        saveStoredTrainingRun(run);
        renderRunPanel(run);
        renderTrainingIfNeeded();
        if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
          es.close();
          state.eventSource = null;
          if (run.status === "completed") {
            creditTrainingBudget(run);
            toast("Training complete — export checkpoint or deploy below");
          }
        }
      } catch (e) {}
    };
  }

  function renderTrainingIfNeeded() {
    if (pageKind() !== "training") return;
    renderTrainingStats(getStoredTrainingRuns());
    renderTrainingTable(getStoredTrainingRuns());
  }

  function trainAlgoChipsHtml() {
    return (
      '<div class="gd-train-algos" aria-label="Supported algorithms">' +
      ["GRPO", "PPO", "DPO", "LoRA adapters"].map(function (label) {
        return '<span class="gd-train-algo">' + label + "</span>";
      }).join("") +
      "</div>"
    );
  }

  function mountTrainToolbar(main) {
    if (document.getElementById("gd-train-toolbar")) return;
    var hero = findPageHero(main);
    var bar = document.createElement("div");
    bar.id = "gd-train-toolbar";
    bar.className = "gd-train-toolbar";
    bar.innerHTML =
      pipelineHtml(1) +
      trainAlgoChipsHtml() +
      '<div id="gd-run-host"></div><div id="gd-runs-list"></div>';
    var anchor =
      (hero && hero.closest(".w-full.mb-3")) ||
      (hero && hero.parentElement) ||
      main.querySelector(".min-w-0.p-4");
    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement("afterend", bar);
    } else {
      var target = main.querySelector(".min-w-0") || main;
      target.insertBefore(bar, target.firstChild);
    }
  }

  function wireTraining() {
    if (pageKind() !== "training") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdTrain === "1") return;
    main.dataset.gdTrain = "1";
    main.classList.add("gd-train-page");

    stylePageHero(
      main,
      "gd-lab-hero",
      "Training",
      "Fine-tune base models with GRPO, PPO, or DPO on environment tasks. Monitor reward curves, export checkpoints, and compare against baseline evaluations."
    );

    mountTrainToolbar(main);
    styleTrainButtons(main);
    window.setTimeout(function () {
      styleTrainButtons(main);
    }, 600);

    var tbody = main.querySelector("table tbody");
    if (tbody && !trainEmptyTbodyHtml) trainEmptyTbodyHtml = tbody.innerHTML;
    patchTrainingTableHeader(main);
    renderTraining();

    document.addEventListener(
      "click",
      function (e) {
        var learn = e.target.closest && e.target.closest("[data-gd-train-learn]");
        if (learn) {
          openTrainDocs(e);
          return;
        }
        var btn = e.target && e.target.closest && e.target.closest("button");
        if (!btn) return;
        var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (
          t.indexOf("Training Run") >= 0 ||
          t === "New Run" ||
          t.indexOf("New Run") >= 0
        ) {
          e.preventDefault();
          e.stopPropagation();
          loadCatalog().then(function () {
            guardedOpenTrainModal();
          });
        }
      },
      true
    );

    var params = new URLSearchParams(location.search);
    var runId = params.get("run");
    if (runId) {
      loadCatalog().then(function () {
        watchRun(runId);
      });
    }
  }

  function wireEvaluations() {
    if (pageKind() !== "evaluations") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdEval === "1") return;
    main.dataset.gdEval = "1";
    main.classList.add("gd-eval-page");

    stylePageHero(
      main,
      "gd-lab-hero",
      "Evaluations",
      "Benchmark model performance on environment tasks. Each run records per-task rewards, traces, and aggregate metrics."
    );

    var toolbar = document.getElementById("gd-eval-toolbar");
    if (toolbar) toolbar.remove();

    var tbody = main.querySelector("table tbody");
    if (tbody && !evalEmptyTbodyHtml) evalEmptyTbodyHtml = tbody.innerHTML;
    styleEvalButtons(main);

    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target && e.target.closest && e.target.closest("button");
        if (!btn) return;
        var t = (btn.textContent || "").trim();
        if (
          t === "New Evaluation" ||
          t.indexOf("New Evaluation") >= 0 ||
          t === "Evaluation" ||
          (t.indexOf("Evaluation") >= 0 && btn.querySelector(".lucide-plus"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          loadCatalog().then(function () {
            guardedOpenEvalModal();
          });
        }
      },
      true
    );

    renderEvaluations();
  }

  var API_KEYS_KEY = "gd-api-keys";

  function getApiKeys() {
    try {
      return JSON.parse(localStorage.getItem(API_KEYS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveApiKeys(list) {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(list));
  }

  function randomKey() {
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var out = "gd_live_";
    for (var i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function renderTokensPage() {
    var host = document.getElementById("gd-tokens-host");
    if (!host) return;
    if (!isSignedIn()) {
      host.innerHTML =
        '<div class="gd-account-page">' +
        '<header class="gd-account-hero"><h1>API Keys</h1>' +
        "<p>Generate keys for the Frontier API and CLI.</p></header>" +
        '<div class="gd-billing-signin"><p>Sign in to create and manage API keys.</p>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-tokens-signin">Sign in</button></div></div>';
      var sb = document.getElementById("gd-tokens-signin");
      if (sb) sb.onclick = function () {
        openSignInModal(renderTokensPage);
      };
      return;
    }
    var keys = getApiKeys();
    host.innerHTML =
      '<div class="gd-account-page">' +
      '<header class="gd-account-hero"><h1>API Keys</h1>' +
      "<p>Generate keys for the API and CLI. Store secrets securely — they are shown once at creation.</p>" +
      '<p class="gd-gate-note">A Lab subscription activates keys for evaluations, training, GPUs, and the Lab API. Public Inference chat is unlocked by holding 20,000 $FRONTIER, not by this key.</p></header>' +
      '<div class="gd-account-panel">' +
      '<div class="gd-account-panel-head">' +
      "<h2>Your keys</h2>" +
      '<button type="button" class="gd-btn gd-btn-primary" id="gd-key-create">Create API key</button>' +
      "</div>" +
      (keys.length
        ? '<table class="gd-table gd-billing-table"><thead><tr><th>Name</th><th>Key</th><th>Created</th><th></th></tr></thead><tbody>' +
          keys
            .map(function (k) {
              return (
                "<tr><td>" +
                escapeHtml(k.name) +
                "</td><td><code class=\"gd-key-code\">" +
                escapeHtml(k.masked) +
                "</code></td><td>" +
                new Date(k.createdAt).toLocaleString() +
                '</td><td><button type="button" class="gd-link-btn" data-revoke="' +
                escapeHtml(k.id) +
                '">Revoke</button></td></tr>'
              );
            })
            .join("") +
          "</tbody></table>"
        : '<p class="gd-billing-empty">No API keys yet. Create one to authenticate CLI and API requests.</p>') +
      '<div id="gd-key-created" class="gd-key-created" hidden></div>' +
      "</div></div>";

    document.getElementById("gd-key-create").onclick = function () {
      openModal(
        "Create API key",
        '<p class="gd-gate-lead">Name this key so you can recognize it later.</p>' +
          '<div class="gd-field"><label class="gd-label">Key name</label>' +
          '<input class="gd-input" id="gd-key-name" placeholder="Production CLI" maxlength="64"/></div>' +
          '<div class="gd-actions" style="justify-content:flex-start">' +
          '<button type="button" class="gd-btn gd-btn-ghost" id="gd-key-cancel">Cancel</button>' +
          '<button type="button" class="gd-btn gd-btn-primary" id="gd-key-go">Generate</button></div>'
      );
      document.getElementById("gd-key-cancel").onclick = closeModal;
      document.getElementById("gd-key-go").onclick = function () {
        var name = (document.getElementById("gd-key-name").value || "").trim() || "API key";
        var raw = randomKey();
        var entry = {
          id: "key-" + Date.now(),
          name: name,
          masked: raw.slice(0, 12) + "…" + raw.slice(-4),
          prefix: raw.slice(0, 12),
          createdAt: new Date().toISOString(),
        };
        // store hashed-ish secret only in session flash; keep prefix in list
        var list = getApiKeys();
        list.unshift(entry);
        saveApiKeys(list);
        closeModal();
        renderTokensPage();
        var box = document.getElementById("gd-key-created");
        if (box) {
          box.hidden = false;
          box.innerHTML =
            "<strong>Copy your key now</strong> — it will not be shown again." +
            '<div class="gd-key-secret"><code id="gd-key-secret-val">' +
            escapeHtml(raw) +
            '</code>' +
            '<button type="button" class="gd-btn gd-btn-primary" id="gd-key-copy">Copy</button></div>';
          document.getElementById("gd-key-copy").onclick = function () {
            if (navigator.clipboard) navigator.clipboard.writeText(raw);
            toast("API key copied");
          };
        }
        toast("API key created. A Lab subscription activates it for evals, training, and GPUs.");
      };
    };
    host.querySelectorAll("[data-revoke]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-revoke");
        saveApiKeys(
          getApiKeys().filter(function (k) {
            return k.id !== id;
          })
        );
        renderTokensPage();
        toast("API key revoked");
      };
    });
  }

  function wireTokensPage() {
    if (pageKind() !== "tokens") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdTokens === "1") return;
    main.dataset.gdTokens = "1";
    var inner = main.querySelector(".min-w-0") || main;
    inner.innerHTML = '<div id="gd-tokens-host" style="padding:1rem"></div>';
    renderTokensPage();
  }

  function renderProfilePage() {
    var host = document.getElementById("gd-profile-host");
    if (!host) return;
    if (!isSignedIn()) {
      host.innerHTML =
        '<div class="gd-account-page">' +
        '<header class="gd-account-hero"><h1>Edit Profile</h1>' +
        "<p>Update your account details.</p></header>" +
        '<div class="gd-billing-signin"><p>Sign in to edit your profile.</p>' +
        '<button type="button" class="gd-btn gd-btn-primary" id="gd-profile-signin">Sign in</button></div></div>';
      var sb = document.getElementById("gd-profile-signin");
      if (sb) sb.onclick = function () {
        openSignInModal(renderProfilePage);
      };
      return;
    }
    var a = getAccount() || {};
    host.innerHTML =
      '<div class="gd-account-page">' +
      '<header class="gd-account-hero"><h1>Edit Profile</h1>' +
      "<p>Update your account details for Olora Cloud.</p></header>" +
      '<form class="gd-account-panel gd-profile-form" id="gd-profile-form">' +
      '<div class="gd-profile-grid">' +
      '<label class="gd-field"><span class="gd-label">Name</span>' +
      '<input class="gd-input" name="name" value="' +
      escapeHtml(a.name || "") +
      '" required/></label>' +
      '<label class="gd-field"><span class="gd-label">Email</span>' +
      '<input class="gd-input" name="email" type="email" value="' +
      escapeHtml(a.email || "") +
      '" required/></label>' +
      '<label class="gd-field"><span class="gd-label">Company</span>' +
      '<input class="gd-input" name="company" value="' +
      escapeHtml(a.company || "") +
      '" placeholder="Acme Labs"/></label>' +
      '<label class="gd-field"><span class="gd-label">Wallet</span>' +
      '<input class="gd-input" name="wallet" value="' +
      escapeHtml(a.wallet || "") +
      '" placeholder="0x…"/></label>' +
      '</div>' +
      '<label class="gd-field"><span class="gd-label">Bio</span>' +
      '<textarea class="gd-input" name="bio" rows="4" placeholder="What you are building…">' +
      escapeHtml(a.bio || "") +
      "</textarea></label>" +
      '<div class="gd-actions" style="justify-content:flex-start">' +
      '<button type="submit" class="gd-btn gd-btn-primary">Save profile</button>' +
      '<a class="gd-btn gd-btn-ghost" href="/lab/dashboard/billing">Manage billing</a>' +
      "</div></form></div>";

    document.getElementById("gd-profile-form").onsubmit = function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var wallet = String(fd.get("wallet") || "").trim();
      if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        toast("Wallet must be an EVM address");
        return;
      }
      saveAccount({
        email: String(fd.get("email") || "").trim().toLowerCase(),
        name: String(fd.get("name") || "").trim(),
        company: String(fd.get("company") || "").trim(),
        wallet: wallet || null,
        bio: String(fd.get("bio") || "").trim(),
        privyId: a.privyId || null,
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast("Profile saved");
      refreshSidebarAccount();
      renderProfilePage();
    };
  }

  function wireProfilePage() {
    if (pageKind() !== "profile") return;
    var main = document.querySelector("main");
    if (!main || main.dataset.gdProfile === "1") return;
    main.dataset.gdProfile = "1";
    var inner = main.querySelector(".min-w-0") || main;
    inner.innerHTML = '<div id="gd-profile-host" style="padding:1rem"></div>';
    renderProfilePage();
  }

  function zapIcon(cls) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' +
      (cls || "") +
      '" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>'
    );
  }

  function wireQuickstartPage() {
    if (pageKind() !== "quickstart") return;
    var main = document.querySelector("main");
    if (!main) return;

    function buildHtml() {
      var steps = [
        {
          n: "1",
          title: "Pick an environment",
          desc: "Browse tasks and jobs your models can be tested and trained on.",
          href: "/lab/dashboard/environments",
          cta: "Open Environments",
        },
        {
          n: "2",
          title: "Run an evaluation",
          desc: "Score a model on a job so you have a clear baseline before training.",
          href: "/lab/dashboard/evaluations",
          cta: "Open Evaluations",
        },
        {
          n: "3",
          title: "Train and improve",
          desc: "Start a training run, then compare before and after scores.",
          href: "/lab/dashboard/training",
          cta: "Open Training",
        },
      ];
      var extras = [
        {
          title: "On-demand GPUs",
          desc: "Rent H100, H200, and B200 compute when local iteration is not enough.",
          href: "/lab/dashboard/on-demand-gpus",
          cta: "Browse GPUs",
        },
        {
          title: "Inference",
          desc: "Browse 400+ models and run them from the lab.",
          href: "/lab/inference",
          cta: "Open Inference",
        },
        {
          title: "Docs",
          desc: "Guides for environments, evaluations, and training.",
          href: "/docs",
          cta: "Read Docs",
        },
      ];
      return (
        '<div class="gd-quickstart-page">' +
        '<section class="gd-quickstart-hero" aria-label="Quickstart">' +
        '<div class="gd-quickstart-hero-bg" aria-hidden="true"></div>' +
        '<div class="gd-quickstart-hero-shade" aria-hidden="true"></div>' +
        '<div class="gd-quickstart-hero-body">' +
        '<div class="gd-quickstart-hero-top">' +
        zapIcon("gd-quickstart-zap") +
        "</div>" +
        '<div class="gd-quickstart-hero-copy">' +
        "<h1>Quickstart</h1>" +
        "<p>Pick an environment, run an evaluation, then start a training job and check the results.</p>" +
        "</div>" +
        '<div class="gd-quickstart-hero-actions">' +
        '<a class="gd-btn gd-btn-outline" href="#gd-qs-steps">Get started</a>' +
        "</div>" +
        "</div>" +
        "</section>" +
        '<ol id="gd-qs-steps" class="gd-quickstart-steps">' +
        steps
          .map(function (s) {
            return (
              '<li class="gd-quickstart-step">' +
              '<div class="gd-quickstart-step-num">' +
              s.n +
              "</div>" +
              '<div class="gd-quickstart-step-body">' +
              "<h2>" +
              s.title +
              "</h2>" +
              "<p>" +
              s.desc +
              "</p>" +
              '<a class="gd-btn gd-btn-ghost" href="' +
              s.href +
              '">' +
              s.cta +
              "</a>" +
              "</div>" +
              "</li>"
            );
          })
          .join("") +
        "</ol>" +
        '<section class="gd-quickstart-extras" aria-label="Next steps">' +
        "<h2>Scale when you need it</h2>" +
        '<div class="gd-quickstart-extra-grid">' +
        extras
          .map(function (e) {
            return (
              '<a class="gd-quickstart-extra" href="' +
              e.href +
              '">' +
              "<h3>" +
              e.title +
              "</h3>" +
              "<p>" +
              e.desc +
              "</p>" +
              '<span class="gd-quickstart-extra-cta">' +
              e.cta +
              "</span>" +
              "</a>"
            );
          })
          .join("") +
        "</div>" +
        "</section>" +
        "</div>"
      );
    }

    function apply() {
      if (main.querySelector(".gd-quickstart-page")) return;
      var inner = main.querySelector(".min-w-0") || main;
      inner.innerHTML = buildHtml();
      main.dataset.gdQuickstart = "1";
    }

    apply();
    if (main._gdQsTimer) clearInterval(main._gdQsTimer);
    var passes = 0;
    main._gdQsTimer = setInterval(function () {
      apply();
      passes += 1;
      if (passes >= 12) clearInterval(main._gdQsTimer);
    }, 350);
  }

  function wireLabAccessGates() {
    // Environments, Training, and Evaluations are publicly viewable.
    // Create / run / train actions stay gated via requireLabAccess.
  }

  function boot() {
    applyLabFonts();
    patchBrand();
    patchSidebar();
    wireSupportTriggers();
    wireAccount();
    wireLabAccessGates();
    rewriteHome();
    rewriteSupportPage();
    wireQuickstartPage();
    wireGpuPage();
    wireGpuCheckoutPage();
    wireEnvironments();
    wireTraining();
    wireEvaluations();
    wireBillingPage();
    wireTokensPage();
    wireProfilePage();
    if (pageKind() !== "environments") loadCatalog();
    // React hydration can restore dead external policy URLs — re-fix briefly.
    var passes = 0;
    var legalTimer = setInterval(function () {
      fixLegalPolicyLinks(document);
      var ref = document.getElementById("gd-sidebar-ref-links");
      if (!ref || !ref.querySelector('a[href="/privacy"] img') || !ref.querySelector('a[href="/terms"] img')) {
        patchSidebarReferenceLinks();
      }
      if (pageKind() === "quickstart") wireQuickstartPage();
      passes += 1;
      if (passes >= 8) clearInterval(legalTimer);
    }, 400);
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
