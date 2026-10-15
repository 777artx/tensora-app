(function () {
  "use strict";

  var ACCENT = "#A8C4E0";
  var GREEN = "#8fd4a4";
  var AMBER = "#d4b896";
  var TOKEN = "#8fa3bf";
  var infRange = "90D";

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e4) return Math.round(n / 1000) + "K";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }

  function fmtUsd(n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    if (n >= 100) return "$" + Math.round(n);
    return "$" + n.toFixed(2);
  }

  function fmtUsdFull(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  /** Same seed + curve as lab-inference/hydrate.js (scaled compute/fees). */
  function buildInferenceSeries() {
    var rand = mulberry32(0x9e3779b9);
    var days = [];
    var total = { input: 0, output: 0, rewards: 0, cost: 0, surplus: 0, requests: 0 };
    for (var i = 0; i < 90; i++) {
      var ageFromEnd = 89 - i;
      var growth = 0.55 + (i / 89) * 0.95;
      var noise = 0.78 + rand() * 0.44;
      var requests = Math.max(2, Math.round((16 + rand() * 18) * growth * noise));
      var inputTok = Math.round(requests * (2400 + rand() * 3200));
      var outputTok = Math.round(inputTok * (0.1 + rand() * 0.06));
      var cost = inputTok * 0.000068 + outputTok * 0.000238;
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

  function buildRevenueSeries() {
    // Weekly MRR from a June start (~$1K) to $7.4K in August. ARR stays under $100K.
    return [
      { label: "Jun", mrr: 980 },
      { label: "", mrr: 1140 },
      { label: "", mrr: 1210 },
      { label: "", mrr: 1680 },
      { label: "", mrr: 1920 },
      { label: "Jul", mrr: 2260 },
      { label: "", mrr: 2380 },
      { label: "", mrr: 3190 },
      { label: "", mrr: 4510 },
      { label: "Aug", mrr: 4860 },
      { label: "", mrr: 5420 },
      { label: "", mrr: 6380 },
      { label: "", mrr: 7400 },
    ];
  }

  var inference = buildInferenceSeries();
  var revenue = buildRevenueSeries();
  var JUL_MRR = 4510;
  var INF_TREASURY = 1820;
  var INF_MODELS = 422;
  var PRESEED_RAISE = 400000;
  var COMPANY_CASH = 305000;

  function sliceInference(range) {
    var n = range === "7D" ? 7 : range === "30D" ? 30 : 90;
    var days = inference.days.slice(-n);
    var total = { input: 0, output: 0, rewards: 0, cost: 0, surplus: 0, requests: 0 };
    days.forEach(function (d) {
      total.input += d.input;
      total.output += d.output;
      total.rewards += d.rewards;
      total.cost += d.cost;
      total.surplus += d.surplus;
      total.requests += d.requests;
    });
    return { days: days, total: total };
  }

  function renderKpis() {
    var host = document.getElementById("gd-ov-kpis");
    if (!host) return;
    var requests = 0;
    var spend = 0;
    var quotes = 0;
    var keys = 0;
    try {
      var hist = JSON.parse(localStorage.getItem("gd-billing-history") || "[]");
      if (Array.isArray(hist)) {
        hist.forEach(function (row) {
          var kind = String(row.kind || "").toLowerCase();
          if (kind.indexOf("request") >= 0 || kind.indexOf("model") >= 0) requests += 1;
          if (kind.indexOf("gpu") >= 0 || kind.indexOf("quote") >= 0) quotes += 1;
          var amt = Number(String(row.amount || "").replace(/[^0-9.]/g, ""));
          if (Number.isFinite(amt)) spend += amt;
        });
      }
      var apiKeys = JSON.parse(localStorage.getItem("gd-api-keys-v2") || "[]");
      if (Array.isArray(apiKeys)) keys = apiKeys.filter(function (k) { return !k.revoked; }).length;
    } catch (e) {}

    host.innerHTML = [
      { label: "Your requests", value: String(requests), meta: "From this account session" },
      { label: "GPU quotes", value: String(quotes), meta: "Saved compute comparisons" },
      { label: "API keys", value: String(keys), meta: "Active project keys" },
      { label: "Recorded spend", value: "$" + spend.toFixed(2), meta: "Activity feed totals only" },
    ]
      .map(function (item) {
        return (
          '<article class="gd-ov-kpi">' +
          '<p class="gd-ov-kpi-label">' +
          item.label +
          "</p>" +
          '<p class="gd-ov-kpi-value">' +
          item.value +
          "</p>" +
          '<p class="gd-ov-kpi-meta">' +
          item.meta +
          "</p></article>"
        );
      })
      .join("");
  }

  function linePath(values, x0, y0, w, h, maxY) {
    var step = w / Math.max(1, values.length - 1);
    return values
      .map(function (v, i) {
        var x = x0 + i * step;
        var y = y0 + h - (v / maxY) * h;
        return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      })
      .join(" ");
  }

  function renderRevenueChart() {
    var host = document.getElementById("gd-ov-rev-chart");
    if (!host) return;
    var w = 560;
    var h = 200;
    var left = 44;
    var right = 16;
    var top = 16;
    var bottom = 28;
    var plotW = w - left - right;
    var plotH = h - top - bottom;
    var maxY = 9000;
    var mrr = revenue.map(function (r) {
      return r.mrr;
    });
    var mrrLine = linePath(mrr, left, top, plotW, plotH, maxY);
    var step = plotW / Math.max(1, revenue.length - 1);
    var area =
      mrrLine +
      " L" +
      (left + plotW).toFixed(1) +
      " " +
      (top + plotH).toFixed(1) +
      " L" +
      left +
      " " +
      (top + plotH).toFixed(1) +
      " Z";

    var yTicks = [0, 3000, 6000, 9000]
      .map(function (v) {
        var y = top + plotH - (v / maxY) * plotH;
        return (
          '<line x1="' +
          left +
          '" x2="' +
          (left + plotW) +
          '" y1="' +
          y.toFixed(1) +
          '" y2="' +
          y.toFixed(1) +
          '" stroke="rgba(255,255,255,0.06)"/>' +
          '<text x="' +
          (left - 6) +
          '" y="' +
          (y + 3).toFixed(1) +
          '" fill="#8a9099" font-size="10" text-anchor="end">' +
          (v === 0 ? "$0" : "$" + v / 1000 + "K") +
          "</text>"
        );
      })
      .join("");

    var labels = revenue
      .map(function (r, i) {
        if (!r.label) return "";
        var anchor = i === 0 ? "start" : i === revenue.length - 1 ? "end" : "middle";
        return (
          '<text x="' +
          (left + i * step).toFixed(1) +
          '" y="' +
          (h - 8) +
          '" fill="#8a9099" font-size="10" text-anchor="' +
          anchor +
          '">' +
          r.label +
          "</text>"
        );
      })
      .join("");

    var lastX = left + plotW;
    var lastY = top + plotH - (mrr[mrr.length - 1] / maxY) * plotH;

    host.innerHTML =
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Monthly recurring revenue">' +
      "<defs>" +
      '<linearGradient id="ovMrr" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      ACCENT +
      '" stop-opacity="0.28"/>' +
      '<stop offset="100%" stop-color="' +
      ACCENT +
      '" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      yTicks +
      '<path d="' +
      area +
      '" fill="url(#ovMrr)"/>' +
      '<path d="' +
      mrrLine +
      '" fill="none" stroke="' +
      ACCENT +
      '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' +
      lastX.toFixed(1) +
      '" cy="' +
      lastY.toFixed(1) +
      '" r="3.5" fill="' +
      ACCENT +
      '"/>' +
      '<text x="' +
      (lastX - 4).toFixed(1) +
      '" y="' +
      (lastY - 10).toFixed(1) +
      '" fill="#f2f3f0" font-size="11" font-weight="600" text-anchor="end">' +
      fmtUsd(mrr[mrr.length - 1]) +
      " MRR</text>" +
      labels +
      "</svg>";
  }

  function renderTreasury() {
    var host = document.getElementById("gd-ov-treasury");
    if (!host) return;
    var dailyBurn = inference.total.cost / 90;
    var rows = [
      { k: "Operating cash", h: "Bank balance after preseed", v: fmtUsdFull(COMPANY_CASH) },
      { k: "Preseed raise", h: "Closed round size", v: fmtUsdFull(PRESEED_RAISE) },
      { k: "Inference pool", h: "Cash reserved for model compute", v: fmtUsd(INF_TREASURY) },
      { k: "Pool daily burn", h: "90-day average compute spend", v: fmtUsd(dailyBurn) + "/day" },
    ];
    host.innerHTML = rows
      .map(function (r) {
        return (
          '<div class="gd-ov-t-row"><div><span class="k">' +
          r.k +
          '</span><span class="h">' +
          r.h +
          '</span></div><span class="v">' +
          r.v +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderInference() {
    var slice = sliceInference(infRange);
    var stats = document.getElementById("gd-ov-inf-stats");
    var chart = document.getElementById("gd-ov-inf-chart");
    if (stats) {
      stats.innerHTML = [
        { k: "Prompts in", v: fmtNum(slice.total.input) },
        { k: "API calls", v: fmtNum(slice.total.requests) },
        { k: "Fees in", v: fmtUsd(slice.total.rewards) },
        { k: "Compute paid", v: fmtUsd(slice.total.cost) },
      ]
        .map(function (s) {
          return (
            '<div class="gd-ov-inf-stat"><div class="k">' +
            s.k +
            '</div><div class="v">' +
            s.v +
            "</div></div>"
          );
        })
        .join("");
    }
    if (!chart) return;

    var days = slice.days;
    var w = 720;
    var h = 220;
    var padL = 36;
    var padR = 8;
    var padT = 18;
    var padB = 16;
    var mid = h * 0.52;
    var plotW = w - padL - padR;
    var maxTok = Math.max.apply(
      null,
      days.map(function (d) {
        return d.input;
      })
    );
    var maxMoney = Math.max.apply(
      null,
      days.map(function (d) {
        return Math.max(d.cost, d.rewards);
      })
    );
    if (maxTok < 1) maxTok = 1;
    if (maxMoney < 0.01) maxMoney = 0.01;
    var slot = plotW / days.length;
    var barW = Math.max(1.5, slot * 0.62);

    var bars = days
      .map(function (d, i) {
        var x = padL + i * slot + (slot - barW) / 2;
        var tokH = (d.input / maxTok) * (mid - padT - 6);
        var costH = (d.cost / maxMoney) * (h - mid - padB - 6);
        var feeH = (d.rewards / maxMoney) * (h - mid - padB - 6);
        var half = barW * 0.5;
        return (
          '<rect x="' +
          x.toFixed(1) +
          '" y="' +
          (mid - tokH).toFixed(1) +
          '" width="' +
          barW.toFixed(1) +
          '" height="' +
          Math.max(0.5, tokH).toFixed(1) +
          '" fill="' +
          TOKEN +
          '" rx="0.5"/>' +
          '<rect x="' +
          x.toFixed(1) +
          '" y="' +
          (mid + 3).toFixed(1) +
          '" width="' +
          half.toFixed(1) +
          '" height="' +
          Math.max(0.5, costH).toFixed(1) +
          '" fill="' +
          AMBER +
          '" rx="0.5"/>' +
          '<rect x="' +
          (x + half).toFixed(1) +
          '" y="' +
          (mid + 3).toFixed(1) +
          '" width="' +
          half.toFixed(1) +
          '" height="' +
          Math.max(0.5, feeH).toFixed(1) +
          '" fill="' +
          GREEN +
          '" rx="0.5"/>'
        );
      })
      .join("");

    chart.innerHTML =
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Inference volume">' +
      '<text x="' +
      padL +
      '" y="12" fill="#8a9099" font-size="9" letter-spacing="0.06em">TOKENS</text>' +
      '<text x="' +
      padL +
      '" y="' +
      (h - 4) +
      '" fill="#8a9099" font-size="9" letter-spacing="0.06em">MONEY</text>' +
      '<line x1="' +
      padL +
      '" x2="' +
      (w - padR) +
      '" y1="' +
      mid +
      '" y2="' +
      mid +
      '" stroke="rgba(255,255,255,0.08)"/>' +
      bars +
      "</svg>";
  }

  function meterRows(hostId, rows) {
    var host = document.getElementById(hostId);
    if (!host) return;
    host.innerHTML = rows
      .map(function (r) {
        return (
          '<div class="gd-ov-meter-row"><span class="name" title="' +
          r.name +
          '">' +
          r.name +
          '</span><div class="gd-ov-meter"><span style="width:' +
          r.pct +
          '%;background:' +
          (r.color || ACCENT) +
          '"></span></div><span class="val">' +
          r.val +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderGpu() {
    meterRows("gd-ov-gpu", [
      { name: "H100", val: "94 h", pct: 100, color: ACCENT },
      { name: "H200", val: "36 h", pct: 38, color: "#7f9db5" },
      { name: "B200", val: "11 h", pct: 12, color: "#5f7f98" },
      { name: "A100", val: "24 h", pct: 26, color: "#4a6478" },
      { name: "4090", val: "48 h", pct: 51, color: "#6b7280" },
    ]);
  }

  function renderFunnel() {
    meterRows("gd-ov-funnel", [
      { name: "Environments", val: "60", pct: 100 },
      { name: "Eval runs", val: "214", pct: 68 },
      { name: "Training", val: "18", pct: 28 },
      { name: "Deployed", val: "7", pct: 14 },
    ]);
  }

  function renderGrowth() {
    meterRows("gd-ov-growth", [
      { name: "Paying teams", val: "16", pct: 58 },
      { name: "Builders", val: "41", pct: 64 },
      { name: "API keys", val: "52", pct: 52 },
      { name: "NPS", val: "48", pct: 55 },
    ]);
  }

  function spark(values) {
    var w = 64;
    var h = 20;
    var max = Math.max.apply(null, values) || 1;
    var step = w / Math.max(1, values.length - 1);
    var d = values
      .map(function (v, i) {
        return (
          (i === 0 ? "M" : "L") +
          (i * step).toFixed(1) +
          "," +
          (h - 2 - (v / max) * (h - 4)).toFixed(1)
        );
      })
      .join(" ");
    return (
      '<svg class="gd-ov-spark" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" aria-hidden="true"><path d="' +
      d +
      '" fill="none" stroke="' +
      ACCENT +
      '" stroke-width="1.5" stroke-linecap="round"/></svg>'
    );
  }

  function renderModels() {
    var host = document.getElementById("gd-ov-models");
    if (!host) return;
    var models = [
      { name: "DeepSeek V3.1", calls: 48, share: 22, spark: [4, 5, 6, 7, 8, 9, 11] },
      { name: "Qwen3 235B", calls: 37, share: 17, spark: [3, 4, 4, 5, 6, 7, 8] },
      { name: "Kimi K2", calls: 31, share: 14, spark: [2, 3, 4, 5, 5, 6, 7] },
      { name: "Llama 4 Scout", calls: 26, share: 12, spark: [5, 5, 4, 5, 6, 5, 6] },
      { name: "GPT-OSS 120B", calls: 20, share: 9, spark: [2, 2, 3, 3, 4, 4, 5] },
      { name: "Other pool", calls: 57, share: 26, spark: [8, 9, 9, 10, 11, 12, 13] },
    ];
    host.innerHTML =
      '<table class="gd-ov-table"><thead><tr><th>Model</th><th>Calls</th><th>Share</th><th>7d</th></tr></thead><tbody>' +
      models
        .map(function (m) {
          return (
            '<tr><td class="model">' +
            m.name +
            "</td><td>" +
            fmtNum(m.calls) +
            "</td><td>" +
            m.share +
            "%</td><td>" +
            spark(m.spark) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  function wireRange() {
    var host = document.getElementById("gd-ov-inf-range");
    if (!host) return;
    host.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-range]");
      if (!btn) return;
      infRange = btn.getAttribute("data-range");
      host.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderInference();
    });
  }

  function boot() {
    renderKpis();
    // Hide company ARR / treasury / fundraising surfaces for customer dashboard
    ["gd-ov-rev-chart", "gd-ov-treasury"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        var section = el.closest("section") || el.closest("article") || el.parentElement;
        if (section) section.style.display = "none";
      }
    });
    document.querySelectorAll("h2").forEach(function (h) {
      var t = (h.textContent || "").trim();
      if (/^Revenue$|^Treasury$/i.test(t)) {
        var block = h.closest("section") || h.closest("article") || h.parentElement;
        if (block) block.style.display = "none";
      }
    });
    var lead = document.querySelector(".gd-ov-lead, .gd-overview-lead, header p");
    if (lead && /Frontier|ARR|treasury/i.test(lead.textContent || "")) {
      lead.textContent = "Your Olora usage — requests, models, compute, and API activity.";
    }
    renderInference();
    renderGpu();
    renderFunnel();
    renderGrowth();
    renderModels();
    wireRange();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
