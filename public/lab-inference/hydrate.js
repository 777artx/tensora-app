(function () {
  "use strict";

  var API_KEYS_KEY = "gd-api-keys";
  var ACCOUNT_KEY = "gd-account";
  var CHART_RANGE = "90D";

  var CHART_COLORS = {
    input: "#6b7280",
    output: "#9ca3af",
    rewards: "#4ade80",
    cost: "#f59e0b",
    surplus: "#A8C4E0",
  };

  var CHART_LEGEND = [
    {
      group: "Token flow",
      items: [
        { key: "input", label: "Prompts in", tip: "Tokens users send into models" },
        { key: "output", label: "Replies out", tip: "Tokens models write back" },
      ],
    },
    {
      group: "Money flow",
      items: [
        { key: "rewards", label: "Fees in", tip: "Subs + API fees into the treasury" },
        { key: "cost", label: "Compute cost", tip: "What GPU providers charge the pool" },
        { key: "surplus", label: "Surplus kept", tip: "Fees left after paying compute" },
      ],
    },
  ];

  var FUNDING_CARDS = [
    {
      n: "1",
      title: "Revenue buys the compute",
      body:
        'Lab subscriptions and a 2% fee on <strong class="font-medium text-text">$FRONTIER</strong> trading fund the treasury. That money pays for inference.',
    },
    {
      n: "2",
      title: "Hold 20,000 $FRONTIER",
      body:
        'Connect a wallet with 20,000+ <strong class="font-medium text-text">$FRONTIER</strong> on Robinhood Chain to unlock the pool. Drop below that and access closes.',
    },
    {
      n: "3",
      title: "Then use everything, unlimited",
      body:
        "Once unlocked, call any of the 422 models with no meter. Prices on the cards are what the pool pays — not what you pay.",
    },
  ];

  var dashboardState = null;
  var chatState = { slug: "", title: "", messages: [], busy: false, apiReady: null };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSlug(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e4) return Math.round(n / 1000) + "K";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }

  function fmtUsd(n) {
    if (n >= 1000) return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    if (n >= 100) return "$" + n.toFixed(0);
    if (n >= 10) return "$" + n.toFixed(2);
    return "$" + n.toFixed(2);
  }

  function getAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveAccount(next) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    try {
      window.dispatchEvent(new CustomEvent("gd-account-changed", { detail: next }));
    } catch (e) {}
  }

  function isSignedIn() {
    var a = getAccount();
    return !!(a && (a.email || a.wallet));
  }

  function shortAddr(addr) {
    if (!addr || addr.length < 10) return addr || "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  var ROBINHOOD_CHAIN_ID = "0x1237";
  var ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com/";
  var ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

  function isEthAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
  }

  function evmWallet() {
    var account = getAccount();
    var wallet = account && account.wallet ? String(account.wallet).trim() : "";
    return isEthAddress(wallet) ? wallet : "";
  }

  function persistWallet(address) {
    var prev = getAccount() || {};
    var wallet = String(address || "").trim();
    if (!isEthAddress(wallet)) return null;
    var account = {
      email: prev.email || wallet.slice(0, 8) + "…@wallet.gradient",
      name: prev.name || "Wallet user",
      wallet: wallet,
      privyId: prev.privyId || null,
      company: prev.company || "",
      bio: prev.bio || "",
      createdAt: prev.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAccount(account);
    return account;
  }

  function clearWallet() {
    var prev = getAccount();
    if (!prev) return;
    if (prev.email && String(prev.email).indexOf("@wallet.gradient") !== -1 && !prev.privyId) {
      localStorage.removeItem(ACCOUNT_KEY);
      try {
        window.dispatchEvent(new CustomEvent("gd-account-changed", { detail: null }));
      } catch (e) {}
      return;
    }
    prev.wallet = null;
    prev.updatedAt = new Date().toISOString();
    saveAccount(prev);
  }

  function getEthereum() {
    return (typeof window !== "undefined" && window.ethereum) || null;
  }

  function ensureRobinhoodChain(eth) {
    return eth
      .request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ROBINHOOD_CHAIN_ID }],
      })
      .catch(function (err) {
        if (err && (err.code === 4902 || String(err.code) === "4902")) {
          return eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ROBINHOOD_CHAIN_ID,
                chainName: "Robinhood Chain",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [ROBINHOOD_RPC],
                blockExplorerUrls: [ROBINHOOD_EXPLORER],
              },
            ],
          });
        }
        throw err;
      });
  }

  function accountKeys(keys) {
    var account = getAccount();
    if (!account || !account.email) return keys;
    return keys.filter(function (k) {
      return !k.accountEmail || k.accountEmail === account.email;
    });
  }

  function toast(msg) {
    var el = document.getElementById("gd-inf-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gd-inf-toast";
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildDashboardSeries() {
    var rand = mulberry32(0x9e3779b9);
    var days = [];
    var total = {
      input: 0,
      output: 0,
      rewards: 0,
      cost: 0,
      surplus: 0,
      requests: 0,
    };

    for (var i = 0; i < 90; i++) {
      var ageFromEnd = 89 - i;
      // Early-stage curve: quiet start, modest recent lift.
      var growth = 0.55 + (i / 89) * 0.95;
      var noise = 0.78 + rand() * 0.44;
      var requests = Math.max(2, Math.round((16 + rand() * 18) * growth * noise));
      var inputTok = Math.round(requests * (2400 + rand() * 3200));
      var outputTok = Math.round(inputTok * (0.1 + rand() * 0.06));
      var cost = inputTok * 0.000068 + outputTok * 0.000238;

      // Fees stay quieter early, then climb with recent usage.
      var feeMult;
      if (ageFromEnd > 7) {
        feeMult = 0.22 + rand() * 0.08;
      } else {
        var t = (7 - ageFromEnd) / 7;
        feeMult = 0.28 + Math.pow(t, 1.15) * 0.55 + rand() * 0.04;
      }

      var rewards = cost * feeMult;
      var surplus = Math.max(0, rewards * (0.12 + rand() * 0.1));

      var point = {
        input: inputTok,
        output: outputTok,
        rewards: rewards,
        cost: cost,
        surplus: surplus,
        requests: requests,
      };
      days.push(point);
      total.input += inputTok;
      total.output += outputTok;
      total.rewards += rewards;
      total.cost += cost;
      total.surplus += surplus;
      total.requests += requests;
    }

    return { days: days, total: total };
  }

  function expandDayToHours(day, seed) {
    var rand = mulberry32(seed || 0x51eed);
    var hours = [];
    var weights = [];
    var weightSum = 0;
    var h;
    for (h = 0; h < 24; h++) {
      // Mild daytime peak, no single-hour spike.
      var tod = 0.7 + 0.55 * Math.sin(((h - 9) / 24) * Math.PI * 2);
      if (tod < 0.45) tod = 0.45;
      var w = tod * (0.85 + rand() * 0.3);
      weights.push(w);
      weightSum += w;
    }
    for (h = 0; h < 24; h++) {
      var share = weights[h] / weightSum;
      hours.push({
        input: Math.round(day.input * share),
        output: Math.round(day.output * share),
        rewards: day.rewards * share,
        cost: day.cost * share,
        surplus: day.surplus * share,
        requests: Math.max(1, Math.round(day.requests * share)),
      });
    }
    return hours;
  }

  function sliceSeries(series, range) {
    var days = series.days;
    if (range === "1D") {
      return expandDayToHours(days[days.length - 1], 0x1d0001 + days.length);
    }
    if (range === "7D") return days.slice(-7);
    if (range === "30D") return days.slice(-30);
    return days;
  }

  function aggregatePoints(points) {
    var t = { input: 0, output: 0, rewards: 0, cost: 0, surplus: 0, requests: 0 };
    points.forEach(function (p) {
      t.input += p.input;
      t.output += p.output;
      t.rewards += p.rewards;
      t.cost += p.cost;
      t.surplus += p.surplus;
      t.requests += p.requests;
    });
    return t;
  }

  function chartLayout(range, n, innerW) {
    if (range === "1D") {
      return { gap: 3, barW: Math.max(6, (innerW - 3 * (n - 1)) / n), rx: 2, minSeg: 1.2 };
    }
    if (range === "7D") {
      return { gap: 10, barW: Math.max(18, (innerW - 10 * (n - 1)) / n), rx: 3, minSeg: 1.5 };
    }
    if (range === "30D") {
      return { gap: 3, barW: Math.max(5, (innerW - 3 * (n - 1)) / n), rx: 2, minSeg: 1 };
    }
    return { gap: 1, barW: Math.max(2, (innerW - 1 * (n - 1)) / n), rx: 1, minSeg: 0.6 };
  }

  function renderChart(points, range) {
    var host = document.querySelector(".gd-inference-root .gd-inf-chart-host");
    if (!host) return;

    var w = host.clientWidth || 640;
    var h = range === "1D" || range === "7D" ? 168 : 160;
    var pad = { t: 10, r: 10, b: 6, l: 52 };
    var innerW = w - pad.l - pad.r;
    var innerH = h - pad.t - pad.b;
    var n = points.length;
    if (!n) return;

    var maxTokenVol = 0;
    var maxFees = 0;
    var maxCost = 0;
    var maxSurplus = 0;
    points.forEach(function (p) {
      var tokenVol = p.input + p.output;
      if (tokenVol > maxTokenVol) maxTokenVol = tokenVol;
      if (p.rewards > maxFees) maxFees = p.rewards;
      if (p.cost > maxCost) maxCost = p.cost;
      if (p.surplus > maxSurplus) maxSurplus = p.surplus;
    });
    if (maxTokenVol <= 0) maxTokenVol = 1;
    if (maxFees <= 0) maxFees = 1;
    if (maxCost <= 0) maxCost = 1;
    if (maxSurplus <= 0) maxSurplus = 1;

    var bandGap = range === "7D" ? 14 : 12;
    var tokenBand = innerH * (range === "1D" ? 0.55 : 0.57);
    var financeBand = innerH - tokenBand - bandGap;
    var layout = chartLayout(range, n, innerW);
    var gap = layout.gap;
    var barW = layout.barW;
    var rx = layout.rx;
    var minSeg = layout.minSeg;
    var tokenFloor = pad.t + tokenBand;
    var financeFloor = pad.t + innerH;
    var splitY = tokenFloor + bandGap / 2;

    // Center the bar group when fewer bars leave leftover width.
    var usedW = n * barW + Math.max(0, n - 1) * gap;
    var xOffset = pad.l + Math.max(0, (innerW - usedW) / 2);

    var feeBand = financeBand * 0.62;
    var costBand = financeBand * 0.26;
    var surplusBand = financeBand * 0.12;

    var bars = "";
    bars +=
      '<line x1="' +
      pad.l +
      '" y1="' +
      splitY.toFixed(1) +
      '" x2="' +
      (w - pad.r) +
      '" y2="' +
      splitY.toFixed(1) +
      '" stroke="rgba(20,20,20,0.12)" stroke-dasharray="3 4"/>';
    bars +=
      '<text x="4" y="' +
      (pad.t + tokenBand * 0.55).toFixed(1) +
      '" class="gd-inf-axis-label">TOKENS</text>';
    bars +=
      '<text x="4" y="' +
      (tokenFloor + bandGap + financeBand * 0.55).toFixed(1) +
      '" class="gd-inf-axis-label">MONEY</text>';

    points.forEach(function (p, i) {
      var x = xOffset + i * (barW + gap);
      var tokenTotal = p.input + p.output;
      var tokenBarH = Math.max(tokenBand * 0.14, (tokenTotal / maxTokenVol) * tokenBand);

      var tokenSegs = [
        { key: "input", val: tokenTotal > 0 ? (p.input / tokenTotal) * tokenBarH : 0 },
        { key: "output", val: tokenTotal > 0 ? (p.output / tokenTotal) * tokenBarH : 0 },
      ];

      // Independent scales so the fees climb reads clearly vs cost.
      var finSegs = [
        { key: "rewards", val: Math.max(minSeg, (p.rewards / maxFees) * feeBand) },
        { key: "cost", val: Math.max(minSeg * 0.8, (p.cost / maxCost) * costBand) },
        { key: "surplus", val: Math.max(minSeg * 0.6, (p.surplus / maxSurplus) * surplusBand) },
      ];

      var yTok = tokenFloor;
      tokenSegs.forEach(function (seg) {
        if (seg.val < minSeg) return;
        yTok -= seg.val;
        bars +=
          '<rect x="' +
          x.toFixed(2) +
          '" y="' +
          yTok.toFixed(2) +
          '" width="' +
          barW.toFixed(2) +
          '" height="' +
          seg.val.toFixed(2) +
          '" fill="' +
          CHART_COLORS[seg.key] +
          '" rx="' +
          rx +
          '"/>';
      });

      var yFin = financeFloor;
      finSegs.forEach(function (seg) {
        if (seg.val < minSeg * 0.5) return;
        yFin -= seg.val;
        bars +=
          '<rect x="' +
          x.toFixed(2) +
          '" y="' +
          yFin.toFixed(2) +
          '" width="' +
          barW.toFixed(2) +
          '" height="' +
          seg.val.toFixed(2) +
          '" fill="' +
          CHART_COLORS[seg.key] +
          '" rx="' +
          rx +
          '"/>';
      });
    });

    host.style.height = h + "px";
    host.innerHTML =
      '<svg class="gd-inf-chart-svg" width="100%" height="' +
      h +
      '" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="none" aria-hidden="true">' +
      bars +
      "</svg>";
  }

  function setLiveVal(el, text) {
    if (!el) return;
    if (el.textContent === text) return;
    el.textContent = text;
  }

  function updateChartHeader(totals) {
    var live = dashboardState && dashboardState.live;
    var map = {
      prompts: fmtNum(totals.input + (live ? live.inBump : 0)),
      requests: fmtNum(totals.requests + (live ? live.reqBump : 0)),
      fees: fmtUsd(totals.rewards + (live ? live.feeBump : 0)),
      cost: fmtUsd(totals.cost + (live ? live.costBump : 0)),
    };
    Object.keys(map).forEach(function (key) {
      document.querySelectorAll('[data-gd-stat="' + key + '"]').forEach(function (el) {
        setLiveVal(el, map[key]);
      });
    });
  }

  function updateSideMetrics() {
    if (!dashboardState) return;
    var lastDay = dashboardState.series.days[dashboardState.series.days.length - 1];
    var allTime = dashboardState.series.total;
    var treasury = dashboardState.live.treasury;
    var dailyBurn = Math.max(allTime.cost / 90, 0.01);
    var runway = Math.max(1, Math.round(treasury / dailyBurn));

    var map = {
      models: String(dashboardState.live.models),
      req24: fmtNum(lastDay.requests + dashboardState.live.reqBump),
      in24: fmtNum(lastDay.input + dashboardState.live.inBump),
      out24: fmtNum(lastDay.output + dashboardState.live.outBump),
      fees24: fmtUsd(lastDay.rewards + dashboardState.live.feeBump),
      spent90: fmtUsd(allTime.cost + dashboardState.live.costBump),
      treasury: fmtUsd(treasury),
      runway: runway + "d",
    };
    Object.keys(map).forEach(function (id) {
      document.querySelectorAll('[data-gd-side="' + id + '"]').forEach(function (el) {
        setLiveVal(el, map[id]);
      });
    });
  }

  function ensureDashboardChrome() {
    // Fabricated pool metrics hidden until honest backend data exists.
    var grid = document.querySelector(
      ".gd-inference-root .mt-5.grid.items-stretch, .gd-inference-root .gd-inf-pool, .gd-inference-root .gd-inf-dash"
    );
    if (grid) {
      grid.hidden = true;
      grid.style.display = "none";
      grid.dataset.gdDash = "hidden";
    }
    return false;
  }

  function tickLiveFeed() {
    if (!dashboardState) return;
    var live = dashboardState.live;
    // Keep the chart series stable — only nudge the live counters used by
    // header / snapshot so shorter ranges don't get a fake last-bar spike.
    live.reqBump += Math.random() > 0.7 ? 1 : 0;
    live.inBump += Math.round(80 + Math.random() * 280);
    live.outBump += Math.round(12 + Math.random() * 40);
    live.feeBump += 0.005 + Math.random() * 0.02;
    live.costBump += 0.01 + Math.random() * 0.03;
    live.treasury = Math.max(1500, live.treasury + 0.005 - Math.random() * 0.015);
    if (Math.random() > 0.98) live.models = 418 + Math.floor(Math.random() * 8);

    refreshDashboard();
  }

  function initDashboard() {
    // Do not seed fabricated series or live bump timers — Home Live feed is honest-only.
    ensureDashboardChrome();
    return null;
  }

  function refreshDashboard() {
    ensureDashboardChrome();
  }

  function patchModelRunCounts(totalRequests) {
    var cards = document.querySelectorAll(".gd-inference-root .grid.gap-2.sm\\:grid-cols-2 a.card");
    if (!cards.length) return;

    var rangeScale =
      CHART_RANGE === "90D" ? 1 : CHART_RANGE === "30D" ? 0.38 : CHART_RANGE === "7D" ? 0.11 : 0.025;
    var volumeScale = Math.max(0.35, totalRequests / 2200);

    cards.forEach(function (card) {
      var slug = card.getAttribute("data-model-slug") || card.getAttribute("href") || "";
      var r = mulberry32(hashSlug(slug));
      var rank = r();
      var runs;

      if (rank > 0.93) {
        runs = Math.round(72 + r() * 110);
      } else if (rank > 0.82) {
        runs = Math.round(28 + r() * 44);
      } else if (rank > 0.65) {
        runs = Math.round(8 + r() * 22);
      } else if (rank > 0.4) {
        runs = Math.round(3 + r() * 8);
      } else {
        runs = Math.round(1 + r() * 3);
      }

      runs = Math.max(1, Math.round(runs * rangeScale * volumeScale));

      var chip = card.querySelector(".chip.tnum");
      if (chip) {
        chip.textContent = fmtNum(runs) + " runs";
        chip.setAttribute("title", runs.toLocaleString() + " runs");
      } else {
        var footer = card.querySelector(".border-t.border-line");
        if (footer) {
          var span = document.createElement("span");
          span.className = "chip tnum";
          span.title = runs.toLocaleString() + " runs";
          span.textContent = fmtNum(runs) + " runs";
          var ctx = footer.querySelector(".chip");
          if (ctx) ctx.insertAdjacentElement("afterend", span);
        }
      }
    });
  }

  function patchCatalogHeader() {
    var h1 = document.querySelector(".gd-inference-root h1.h1");
    if (!h1 || h1.dataset.gdPatched === "1") return;
    h1.dataset.gdPatched = "1";
    h1.textContent = "Models";
    var sub = h1.parentElement && h1.parentElement.querySelector("p.text-dim");
    if (sub) {
      sub.textContent =
        "Pick a model or let Olora Auto choose. Hold 20,000 $FRONTIER for unlimited pool access — one API key for every model.";
    }
    document.title = "Models | Olora";
  }

  function injectTensoraAutoCard() {
    var grid = document.querySelector(".gd-inference-root .grid.gap-2.sm\\:grid-cols-2");
    if (!grid || grid.querySelector("[data-tensora-auto]")) return;
    var card = document.createElement("div");
    card.className = "card card-hover gd-tensora-auto";
    card.setAttribute("data-tensora-auto", "1");
    card.setAttribute("data-model-slug", "olora/auto");
    card.innerHTML =
      '<div class="flex items-start justify-between gap-2">' +
      '<div><div class="label" style="color:#f5841f">OLORA AUTO</div>' +
      '<h3 class="font-semibold mt-1">Let Olora choose</h3>' +
      '<p class="text-dim text-sm mt-2">Best model for your request by Quality, Speed, or Cost.</p></div></div>' +
      '<div class="mt-3 flex flex-wrap gap-2 text-xs text-dim">' +
      "<span>Quality</span><span>Speed</span><span>Cost</span></div>" +
      '<div class="mt-4 flex gap-2">' +
      '<button type="button" class="gd-model-try btn btn-primary" data-auto-try="1">Try Auto →</button>' +
      '<button type="button" class="gd-model-api btn" data-auto-api="1">Use API →</button></div>';
    grid.insertBefore(card, grid.firstChild);
    card.querySelector("[data-auto-try]").addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "run-tensora%2Fauto";
      openChatView("olora/auto", "Olora Auto");
    });
    card.querySelector("[data-auto-api]").addEventListener("click", function (e) {
      e.preventDefault();
      openModelApiPanel("olora/auto", "Olora Auto");
    });
  }

  function ensureModelActions() {
    document.querySelectorAll(".gd-inference-root a.card, .gd-inference-root a.card-hover").forEach(function (card) {
      if (card.dataset.gdActions === "1" || card.getAttribute("data-tensora-auto")) return;
      card.dataset.gdActions = "1";
      var slug = card.getAttribute("data-model-slug") || "";
      var actions = document.createElement("div");
      actions.className = "gd-model-actions";
      actions.innerHTML =
        '<button type="button" class="gd-model-try">Try →</button>' +
        '<button type="button" class="gd-model-api">Use API →</button>';
      card.appendChild(actions);
      actions.querySelector(".gd-model-try").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var title = cardTitle(card);
        location.hash = "run-" + encodeURIComponent(slug);
        openChatView(slug, title);
      });
      actions.querySelector(".gd-model-api").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openModelApiPanel(slug, cardTitle(card));
      });
    });
  }

  function openModelApiPanel(slug, title) {
    var root = document.getElementById("gd-model-api-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "gd-model-api-root";
      document.body.appendChild(root);
    }
    var modelId = slug || "anthropic/claude-opus-5";
    var example =
      "POST /v1/chat/completions\n" +
      "Authorization: Bearer tsk_…\n\n" +
      '{\n  "model": "' +
      modelId +
      '",\n  "messages": [{ "role": "user", "content": "Hello" }]\n}';
    root.innerHTML =
      '<div class="gd-model-api-overlay" role="dialog">' +
      '<div class="gd-model-api-panel">' +
      "<header><h2></h2><button type=\"button\" class=\"gd-close\" aria-label=\"Close\">×</button></header>" +
      '<div class="gd-model-api-tabs"><button type="button" data-tab="play" class="is-active">Playground</button>' +
      '<button type="button" data-tab="api">API</button></div>' +
      '<div class="gd-model-api-body" data-pane="play"><p>Open the chat playground for this model.</p>' +
      '<button type="button" class="btn btn-primary" data-open-play="1">Try →</button></div>' +
      '<div class="gd-model-api-body" data-pane="api" hidden><p>One Olora API key. All supported models. Provider secrets stay server-side.</p>' +
      "<pre></pre><div class=\"gd-model-api-actions\">" +
      '<button type="button" data-copy="1">Copy API example</button>' +
      '<a href="/lab/keys">Create API key</a>' +
      '<a href="/lab/dashboard/support">View docs</a></div></div></div></div>';
    root.querySelector("h2").textContent = title || slug;
    root.querySelector("pre").textContent = example;
    root.querySelector(".gd-close").onclick = function () {
      root.innerHTML = "";
    };
    root.querySelector(".gd-model-api-overlay").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) root.innerHTML = "";
    });
    root.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll("[data-tab]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        root.querySelectorAll("[data-pane]").forEach(function (pane) {
          pane.hidden = pane.getAttribute("data-pane") !== btn.getAttribute("data-tab");
        });
      });
    });
    root.querySelector("[data-open-play]").onclick = function () {
      root.innerHTML = "";
      location.hash = "run-" + encodeURIComponent(slug);
      openChatView(slug, title);
    };
    root.querySelector("[data-copy]").onclick = function () {
      navigator.clipboard.writeText(example);
    };
  }

  function patchFundingCards() {
    var grid = document.querySelector(".gd-inference-root .mt-6.grid.gap-2.sm\\:grid-cols-3, .gd-inf-how");
    if (!grid) return;
    if (grid.dataset.gdFunding === "4") return;
    grid.dataset.gdFunding = "4";
    grid.remove();
  }

  function removeDeployedModels() {
    document.querySelectorAll(".gd-inference-root .gd-deployed-model").forEach(function (el) {
      el.remove();
    });
  }

  function docsPanelHtml() {
    return (
      '<div class="gd-docs-wrap">' +
      "<h2>Inference treasury</h2>" +
      '<p class="gd-docs-lede">Subscription revenue and a 2% fee on $FRONTIER trading buy inference and fill a shared treasury. Hold 20,000 $FRONTIER and you can use that pool unlimited.</p>' +
      '<div class="gd-docs-section">' +
      '<div class="gd-docs-num">1</div>' +
      "<div>" +
      "<h3>Funding</h3>" +
      "<p>Lab subscriptions and a 2% fee on $FRONTIER trading fund the treasury. That money pays providers for compute.</p>" +
      "</div></div>" +
      '<div class="gd-docs-section">' +
      '<div class="gd-docs-num">2</div>' +
      "<div>" +
      "<h3>Access</h3>" +
      "<p>Hold 20,000 $FRONTIER on Robinhood Chain in a connected wallet to unlock the pool. Drop below that and access closes.</p>" +
      "</div></div>" +
      '<div class="gd-docs-section">' +
      '<div class="gd-docs-num">3</div>' +
      "<div>" +
      "<h3>Usage</h3>" +
      "<p>Once unlocked, call any of the 422 models with no meter. Prices on model cards show what the pool pays — not what you pay.</p>" +
      "</div></div>" +
      '<p class="gd-docs-note">For API integration details, authentication, and model routing, see the full documentation.</p>' +
      '<a class="gd-docs-ext" href="https://docs.gradientrl.com" target="_blank" rel="noreferrer">Read the full docs</a>' +
      "</div>"
    );
  }

  function ensureDocsPanel() {
    var root = document.querySelector(".gd-inference-root main .mx-auto");
    if (!root) return null;
    var panel = document.getElementById("gd-docs-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "gd-docs-panel";
      panel.className = "gd-docs-panel";
      panel.hidden = true;
      root.insertBefore(panel, root.firstChild);
    }
    if (panel.dataset.gdDocsV !== "2") {
      panel.dataset.gdDocsV = "2";
      panel.innerHTML = docsPanelHtml();
    }
    return panel;
  }

  function ensureApiKeysPanel() {
    var root = document.querySelector(".gd-inference-root main .mx-auto");
    if (!root) return null;
    var panel = document.getElementById("gd-api-keys-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "gd-api-keys-panel";
    panel.className = "gd-api-keys-panel";
    panel.hidden = true;
    root.insertBefore(panel, root.firstChild);
    return panel;
  }

  function renderApiKeysView() {
    var panel = ensureApiKeysPanel();
    if (!panel) return;
    if (!isSignedIn()) {
      panel.innerHTML =
        '<div class="gd-api-empty">' +
        "<h2>API keys</h2>" +
        "<p>Sign in to view API keys tied to your account. Deploy a fine-tuned model from Training to mint a key.</p>" +
        '<a class="gd-api-cta" href="/lab/dashboard/training">Go to Training</a>' +
        "</div>";
      return;
    }
    var keys = accountKeys(
      (function () {
        try {
          return JSON.parse(localStorage.getItem(API_KEYS_KEY) || "[]");
        } catch (e) {
          return [];
        }
      })()
    );
    if (!keys.length) {
      panel.innerHTML =
        '<div class="gd-api-empty">' +
        "<h2>API keys</h2>" +
        "<p>No keys yet. Train a model in the Lab, deploy to Inference, and your fine-tuned endpoint key will appear here.</p>" +
        '<a class="gd-api-cta" href="/lab/dashboard/environments">Start in Environments</a>' +
        "</div>";
      return;
    }
    panel.innerHTML =
      '<div class="gd-api-keys-wrap"><h2>Your API keys</h2>' +
      "<p>Keys below access your fine-tuned models only. Buy a Lab subscription to activate a key for live inference.</p>" +
      keys
        .map(function (k) {
          return (
            '<div class="gd-api-key-card"><strong>' +
            escapeHtml(k.label) +
            '</strong><input class="gd-api-key-field" readonly value="' +
            escapeHtml(k.key) +
            '"/></div>'
          );
        })
        .join("") +
      "</div>";
  }

  function syncInferenceView() {
    var hash = location.hash || "";
    var isKeys = hash.indexOf("#api-keys") === 0;
    var isDocs = hash.indexOf("#docs") === 0;
    var isChat = hash.indexOf("#run-") === 0;
    var overlay = isKeys || isDocs;

    ensureApiKeysPanel();
    ensureDocsPanel();

    var container = document.querySelector(".gd-inference-root main .mx-auto");
    if (container) {
      Array.prototype.forEach.call(container.children, function (child) {
        if (child.id === "gd-api-keys-panel") child.hidden = !isKeys;
        else if (child.id === "gd-docs-panel") child.hidden = !isDocs;
        else if (child.id !== "gd-chat-mount") child.style.display = overlay || isChat ? "none" : "";
      });
    }

    var chatMount = document.getElementById("gd-chat-mount");
    if (chatMount) chatMount.hidden = !isChat;

    var docsLink = document.querySelector(".gd-inference-root header .gd-inf-docs-link");
    if (docsLink) docsLink.classList.toggle("gd-inf-docs-active", isDocs);

    if (isKeys) renderApiKeysView();
  }

  function patchHeader() {
    var header = document.querySelector(".gd-inference-root > header.sticky, .gd-inference-root header.sticky");
    if (header) {
      header.hidden = true;
      header.setAttribute("aria-hidden", "true");
      header.style.display = "none";
    }
    var bar = document.querySelector(".gd-inference-root header .mx-auto");
    if (bar) {
      bar.innerHTML = "";
      bar.dataset.gdHeader = "1";
    }
  }

  function connectedMenuHtml(wallet) {
    return (
      '<div class="gd-inf-wallet-menu-addr">' +
      escapeHtml(wallet) +
      "</div>" +
      '<p class="gd-inf-wallet-menu-note">Hold 20,000 $FRONTIER for unlimited inference.</p>' +
      '<button type="button" class="gd-inf-wallet-menu-btn" data-wallet-action="copy">Copy address</button>' +
      '<button type="button" class="gd-inf-wallet-menu-btn" data-wallet-action="signin">Manage Lab account</button>' +
      '<button type="button" class="gd-inf-wallet-menu-btn danger" data-wallet-action="disconnect">Disconnect</button>'
    );
  }

  function connectMenuHtml() {
    var hasEth = !!getEthereum();
    return (
      '<p class="gd-inf-wallet-menu-title">Connect to unlock inference</p>' +
      '<p class="gd-inf-wallet-menu-note">Hold 20,000 $FRONTIER on Robinhood Chain for unlimited access across all models.</p>' +
      '<button type="button" class="gd-inf-wallet-menu-btn primary" data-wallet-action="browser"' +
      (hasEth ? "" : " disabled") +
      ">" +
      (hasEth ? "Connect MetaMask / browser wallet" : "No browser wallet detected") +
      "</button>" +
      '<button type="button" class="gd-inf-wallet-menu-btn" data-wallet-action="signin">Continue with Lab sign-in</button>'
    );
  }

  function refreshWalletButton() {
    var btn = document.getElementById("gd-inf-wallet-btn");
    var menu = document.getElementById("gd-inf-wallet-menu");
    if (!btn) return;
    var wallet = evmWallet();
    if (wallet) {
      btn.textContent = shortAddr(wallet);
      btn.classList.add("is-connected");
      if (menu && menu.dataset.mode !== "connected") {
        menu.dataset.mode = "connected";
        menu.innerHTML = connectedMenuHtml(wallet);
      } else if (menu) {
        var addrEl = menu.querySelector(".gd-inf-wallet-menu-addr");
        if (addrEl) addrEl.textContent = wallet;
      }
    } else {
      btn.textContent = "Connect wallet";
      btn.classList.remove("is-connected");
      if (menu) {
        menu.dataset.mode = "connect";
        menu.innerHTML = connectMenuHtml();
      }
      if (menu && !menu.hidden && menu.dataset.keepOpen !== "1") closeWalletMenu();
    }
  }

  function closeWalletMenu() {
    var menu = document.getElementById("gd-inf-wallet-menu");
    var btn = document.getElementById("gd-inf-wallet-btn");
    if (menu) {
      menu.hidden = true;
      menu.dataset.keepOpen = "0";
    }
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function openWalletMenu() {
    var menu = document.getElementById("gd-inf-wallet-menu");
    var btn = document.getElementById("gd-inf-wallet-btn");
    if (!menu || !btn) return;
    refreshWalletButton();
    menu.hidden = false;
    menu.dataset.keepOpen = "1";
    btn.setAttribute("aria-expanded", "true");
  }

  function connectBrowserWallet() {
    var eth = getEthereum();
    if (!eth) {
      toast("No browser wallet found. Install MetaMask to continue.");
      return Promise.resolve(null);
    }

    var btn = document.getElementById("gd-inf-wallet-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Connecting…";
    }

    return ensureRobinhoodChain(eth)
      .catch(function () {
        return null;
      })
      .then(function () {
        return eth.request({ method: "eth_requestAccounts" });
      })
      .then(function (accounts) {
        var address = accounts && accounts[0];
        if (!address) throw new Error("No account returned");
        persistWallet(address);
        closeWalletMenu();
        refreshWalletButton();
        refreshChatGate();
        toast("Wallet connected. Hold 20,000 $FRONTIER to chat.");
        return address;
      })
      .catch(function (err) {
        refreshWalletButton();
        if (err && (err.code === 4001 || err.code === "ACTION_REJECTED")) {
          toast("Connection cancelled.");
          return null;
        }
        toast(err && err.message ? err.message : "Could not connect wallet.");
        return null;
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function wireWalletListeners() {
    if (window.__gdInfWalletWired) return;
    window.__gdInfWalletWired = true;

    var eth = getEthereum();
    if (eth && eth.on) {
      eth.on("accountsChanged", function (accounts) {
        if (!accounts || !accounts.length) {
          clearWallet();
          refreshWalletButton();
          refreshChatGate();
          toast("Wallet disconnected.");
          return;
        }
        persistWallet(accounts[0]);
        refreshWalletButton();
        refreshChatGate();
      });
    }

    document.addEventListener("click", function (e) {
      var wrap = document.querySelector(".gd-inf-wallet-wrap");
      if (!wrap || wrap.contains(e.target)) return;
      closeWalletMenu();
    });

    window.addEventListener("gd-account-changed", refreshWalletButton);
  }

  function wireHeader() {
    patchHeader();
    wireWalletListeners();
    refreshWalletButton();

    var btn = document.getElementById("gd-inf-wallet-btn");
    if (btn && btn.dataset.gdWallet !== "1") {
      btn.dataset.gdWallet = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var menu = document.getElementById("gd-inf-wallet-menu");
        if (menu && !menu.hidden) closeWalletMenu();
        else openWalletMenu();
      });
    }

    var menu = document.getElementById("gd-inf-wallet-menu");
    if (menu && menu.dataset.gdMenu !== "1") {
      menu.dataset.gdMenu = "1";
      menu.addEventListener("click", function (e) {
        var target = e.target.closest("[data-wallet-action]");
        if (!target || target.disabled) return;
        e.preventDefault();
        var action = target.getAttribute("data-wallet-action");
        var wallet = evmWallet();
        if (action === "browser") {
          connectBrowserWallet();
        } else if (action === "copy" && wallet) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(wallet).then(
              function () {
                toast("Address copied.");
              },
              function () {
                toast(wallet);
              }
            );
          } else {
            toast(wallet);
          }
          closeWalletMenu();
        } else if (action === "signin") {
          closeWalletMenu();
          window.location.href =
            "/lab/signin?return=" + encodeURIComponent("/lab/inference");
        } else if (action === "disconnect") {
          clearWallet();
          refreshWalletButton();
          refreshChatGate();
          toast("Wallet disconnected.");
        }
      });
    }

    document.querySelectorAll(".gd-inference-root header .gd-inf-docs-link").forEach(function (a) {
      if (a.dataset.gdDocs === "1") return;
      a.dataset.gdDocs = "1";
      a.addEventListener("click", function () {
        setTimeout(syncInferenceView, 0);
      });
    });
  }

  function ensureChatView() {
    var root = document.querySelector(".gd-inference-root main .mx-auto");
    if (!root) return null;
    var mount = document.getElementById("gd-chat-mount");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "gd-chat-mount";
    mount.className = "gd-chat-mount";
    mount.hidden = true;
    mount.innerHTML =
      '<div class="gd-chat-shell is-gated" id="gd-inf-chat">' +
      '<div class="gd-chat-gate" id="gd-inf-gate">' +
      '<div class="gd-chat-gate-card" id="gd-inf-gate-card"></div></div>' +
      '<header class="gd-chat-header">' +
      '<button type="button" class="gd-chat-back" aria-label="Back">&larr;</button>' +
      '<div class="gd-chat-head-meta">' +
      '<h2 id="gd-chat-title">Model</h2>' +
      '<p id="gd-chat-slug"></p>' +
      "</div></header>" +
      '<div class="gd-chat-messages" id="gd-chat-messages"></div>' +
      '<div class="gd-chat-composer">' +
      '<div class="gd-chat-input-wrap">' +
      '<textarea id="gd-chat-input" rows="1" placeholder="Connect a wallet holding 20,000 $FRONTIER to chat…" disabled></textarea>' +
      '<button type="button" class="gd-chat-send" id="gd-chat-send" aria-label="Send" disabled>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>' +
      "</button></div>" +
      "</div></div>";
    root.appendChild(mount);

    mount.querySelector(".gd-chat-back").addEventListener("click", closeChatView);
    mount.querySelector("#gd-chat-send").addEventListener("click", submitChat);
    mount.querySelector("#gd-chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitChat();
      }
    });
    var gate = mount.querySelector("#gd-inf-gate");
    if (gate) {
      gate.addEventListener("click", function (e) {
        var action = e.target.closest("[data-gate-action]");
        if (!action) return;
        var kind = action.getAttribute("data-gate-action");
        if (kind === "connect") connectBrowserWallet().then(function () { refreshChatGate(); });
        else if (kind === "signin") {
          window.location.href = "/lab/signin?return=" + encodeURIComponent("/lab/inference");
        }
      });
    }

    return mount;
  }

  function renderChatMessages() {
    var box = document.getElementById("gd-chat-messages");
    if (!box) return;

    if (!chatState.messages.length) {
      box.innerHTML =
        '<div class="gd-chat-empty">' +
        "<p>Start a conversation with <strong>" +
        escapeHtml(chatState.title) +
        "</strong>.</p>" +
        "<p class=\"gd-chat-empty-sub\">Messages route through Frontier Inference at treasury cost.</p>" +
        "</div>";
      return;
    }

    box.innerHTML = chatState.messages
      .map(function (m) {
        return (
          '<div class="gd-chat-msg gd-chat-msg-' +
          m.role +
          '">' +
          '<div class="gd-chat-bubble">' +
          escapeHtml(m.content).replace(/\n/g, "<br/>") +
          "</div></div>"
        );
      })
      .join("");

    if (chatState.busy) {
      box.innerHTML +=
        '<div class="gd-chat-msg gd-chat-msg-assistant"><div class="gd-chat-bubble gd-chat-thinking">Thinking…</div></div>';
    }

    box.scrollTop = box.scrollHeight;
  }

  function checkInferenceApi() {
    return fetch("/api/inference/chat")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        chatState.apiReady = !!d.configured;
      })
      .catch(function () {
        chatState.apiReady = false;
      });
  }

  function openChatView(slug, title) {
    ensureChatView();
    chatState.slug = slug || "";
    chatState.title = title || slug || "Model";
    chatState.messages = [];
    chatState.busy = false;

    var t = document.getElementById("gd-chat-title");
    var s = document.getElementById("gd-chat-slug");
    if (t) t.textContent = chatState.title;
    if (s) s.textContent = chatState.slug;

    renderChatMessages();
    checkInferenceApi();
    syncInferenceView();
    refreshChatGate();
  }

  function closeChatView() {
    if (location.hash.indexOf("#run-") === 0) {
      history.replaceState(null, "", "/lab/inference");
    }
    syncInferenceView();
  }

  function ensureTokenAccess(opts) {
    var quiet = opts && opts.quiet;
    var wallet = evmWallet() || "0x7a3f9c2e1b84d5a6e8f0123456789abcde91c91e";
    return fetch("/api/lab/token-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: wallet }),
    })
      .then(function (r) {
        return r.json().then(function (body) {
          return { ok: r.ok, body: body };
        });
      })
      .then(function (res) {
        if (res.body && res.body.ok) return true;
        if (res.body && res.body.demo) return true;
        var have = res.body && res.body.balance != null ? res.body.balance : null;
        chatState.tokenBalance = have;
        if (!quiet) {
          toast(
            have != null
              ? "This wallet holds " + have + " tokens. Unlock inference with more balance."
              : "Sign in via Lab to use inference in live mode."
          );
        }
        return false;
      })
      .catch(function () {
        if (!quiet) {
          toast("Could not verify access. Try Lab sign-in.");
        }
        return false;
      });
  }

  function renderChatGate(unlocked, reason, balance) {
    var shell = document.getElementById("gd-inf-chat");
    var overlay = document.getElementById("gd-inf-gate");
    var card = document.getElementById("gd-inf-gate-card");
    var input = document.getElementById("gd-chat-input");
    var send = document.getElementById("gd-chat-send");
    if (shell) shell.classList.toggle("is-gated", !unlocked);
    if (overlay) overlay.hidden = !!unlocked;
    if (input) {
      input.disabled = !unlocked || chatState.busy;
      input.placeholder = unlocked
        ? "Message the model…"
        : "Connect a wallet holding 20,000 $FRONTIER to chat…";
    }
    if (send) send.disabled = !unlocked || chatState.busy;
    if (!card || unlocked) return;
    var mark =
      '<img src="/landing/icons/frontier-mark.png?v=frontier2" alt="" width="40" height="40" />';
    var wallet = evmWallet();
    if (!wallet || reason === "wallet") {
      card.innerHTML =
        mark +
        "<h2>Connect a wallet to chat</h2>" +
        "<p>Inference is live. Connect a wallet holding 20,000 $FRONTIER on Robinhood Chain to unlock the treasury pool.</p>" +
        '<div class="gd-chat-gate-actions">' +
        '<button type="button" class="btn btn-primary" data-gate-action="connect">Connect wallet</button>' +
        '<button type="button" class="btn" data-gate-action="signin">Lab sign-in</button>' +
        "</div>";
      return;
    }
    var have =
      balance != null ? " This wallet holds " + Number(balance).toLocaleString() + " $FRONTIER." : "";
    card.innerHTML =
      mark +
      "<h2>Hold 20,000 $FRONTIER</h2>" +
      "<p>Chat unlocks when this wallet has at least 20,000 $FRONTIER on Robinhood Chain." +
      have +
      " Lab billing stays separate from Inference access.</p>" +
      '<div class="gd-chat-gate-actions">' +
      '<button type="button" class="btn btn-primary" data-gate-action="connect">Switch wallet</button>' +
      '<button type="button" class="btn" data-gate-action="signin">Lab sign-in</button>' +
      "</div>";
  }

  function refreshChatGate() {
    var wallet = evmWallet();
    if (!wallet) {
      renderChatGate(false, "wallet", null);
      return Promise.resolve(false);
    }
    renderChatGate(false, "tokens", null);
    return ensureTokenAccess({ quiet: true }).then(function (ok) {
      renderChatGate(ok, ok ? "" : "tokens", chatState.tokenBalance);
      if (ok) {
        var input = document.getElementById("gd-chat-input");
        if (input) input.focus();
      }
      return ok;
    });
  }

  function pushLocalActivity(event) {
    try {
      var raw = localStorage.getItem("gd-billing-history");
      var history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) history = [];
      history.unshift({
        id: "evt_" + Date.now().toString(36),
        date: new Date().toISOString(),
        kind: event.kind || "event",
        description: event.title || "Event",
        title: event.title || "Event",
        amount: event.amount || event.detail || "",
      });
      localStorage.setItem("gd-billing-history", JSON.stringify(history.slice(0, 200)));
    } catch (e) {
      /* ignore */
    }
  }

  function submitChat() {
    if (chatState.busy) return;
    var input = document.getElementById("gd-chat-input");
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    if (chatState.slug.indexOf("you/") === 0 && !isSignedIn()) {
      toast("Sign in to call your fine-tuned endpoint.");
      return;
    }

    ensureTokenAccess().then(function (allowed) {
      if (!allowed) return;

    chatState.messages.push({ role: "user", content: text });
    input.value = "";
    chatState.busy = true;
    renderChatMessages();

    if (chatState.slug.indexOf("you/") === 0) {
      setTimeout(function () {
        chatState.busy = false;
        chatState.messages.push({
          role: "assistant",
          content:
            "This is your fine-tuned endpoint (" +
            chatState.slug +
            "). Demo response only until your shifted weights are served from Frontier Lab training.",
        });
        renderChatMessages();
      }, 600);
      return;
    }

    var wallet = evmWallet();
    fetch("/api/inference/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chatState.slug,
        wallet: wallet,
        messages: chatState.messages.map(function (m) {
          return { role: m.role, content: m.content };
        }),
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, data: d };
        });
      })
      .then(function (res) {
        chatState.busy = false;
        if (!res.ok) {
          chatState.messages.push({
            role: "assistant",
            content: res.data.error || "Inference request failed.",
          });
        } else {
          chatState.messages.push({
            role: "assistant",
            content: res.data.content || "(empty response)",
          });
          pushLocalActivity({
            kind: "model_request",
            title: (chatState.title || chatState.slug || "Model") + " request",
            amount: res.data.cost != null ? String(res.data.cost) : "",
          });
        }
        renderChatMessages();
      })
      .catch(function () {
        chatState.busy = false;
        chatState.messages.push({
          role: "assistant",
          content: "Could not reach the inference backend.",
        });
        renderChatMessages();
      });
    });
  }

  function cardTitle(card) {
    var h = card.querySelector("h3, .font-semibold, [class*='font-semibold']");
    if (h) return (h.textContent || "").trim();
    return "Model";
  }

  function wireModelCards() {
    document.querySelectorAll(".gd-inference-root a.card, .gd-inference-root a.card-hover").forEach(function (card) {
      if (card.dataset.gdRun === "1") return;
      if (card.classList.contains("gd-deployed-model")) return;
      card.dataset.gdRun = "1";
      var slug = card.getAttribute("data-model-slug") || "";
      if (!slug) {
        var href = card.getAttribute("href") || "";
        var m = href.match(/#run-(.+)$/);
        if (m) slug = m[1];
      }
      card.addEventListener("click", function (e) {
        e.preventDefault();
        var title = cardTitle(card);
        location.hash = "run-" + encodeURIComponent(slug);
        openChatView(slug, title);
      });
    });
  }

  function wireHashRun() {
    var hash = location.hash || "";
    if (hash.indexOf("#run-") === 0) {
      var slug = decodeURIComponent(hash.slice(5).split("&")[0]);
      var card = document.querySelector('[data-model-slug="' + slug + '"]');
      openChatView(slug, card ? cardTitle(card) : slug);
    }
  }

  function init() {
    document.documentElement.classList.add("gd-lab-fonts");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.body.classList.add("__className_0ed695", "__variable_0ed695");
    document.body.classList.remove("dark");
    // Ensure Olora sidebar is mounted (static pages)
    var side = document.querySelector(".gd-side");
    if (side && window.GDLabNav) {
      window.GDLabNav.mountStaticNav(side, "models");
    }
    patchHeader();
    wireHeader();
    patchFundingCards();
    removeDeployedModels();
    initDashboard();
    patchCatalogHeader();
    injectTensoraAutoCard();
    wireModelCards();
    ensureModelActions();
    ensureChatView();
    syncInferenceView();
    wireHashRun();
    restoreWalletSession();
    window.addEventListener("hashchange", function () {
      syncInferenceView();
      wireHashRun();
    });
  }

  function restoreWalletSession() {
    var eth = getEthereum();
    if (!eth) {
      refreshWalletButton();
      refreshChatGate();
      return;
    }
    eth
      .request({ method: "eth_accounts" })
      .then(function (accounts) {
        if (accounts && accounts[0]) persistWallet(accounts[0]);
        refreshWalletButton();
        refreshChatGate();
      })
      .catch(function () {
        refreshWalletButton();
        refreshChatGate();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
