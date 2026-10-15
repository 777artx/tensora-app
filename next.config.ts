import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/lab/home", permanent: false },
      { source: "/lab", destination: "/lab/home", permanent: false },
      { source: "/lab/tools", destination: "/lab/agents", permanent: false },
      { source: "/lab/tools/", destination: "/lab/agents", permanent: false },
      { source: "/lab/integrations", destination: "/lab/home", permanent: false },
      { source: "/lab/integrations/", destination: "/lab/home", permanent: false },
      { source: "/lab/", destination: "/lab/home", permanent: false },
      { source: "/signin", destination: "/lab/signin", permanent: false },
      { source: "/signin/", destination: "/lab/signin", permanent: false },
      { source: "/overview", destination: "/lab/dashboard", permanent: false },
      { source: "/cloud", destination: "/lab/compute", permanent: false },
      { source: "/network", destination: "/lab/network", permanent: false },
      { source: "/activity", destination: "/lab/activity", permanent: false },
      {
        source: "/lab/dashboard/overview",
        destination: "/lab/dashboard",
        permanent: false,
      },
      {
        source: "/lab/dashboard/overview/",
        destination: "/lab/dashboard",
        permanent: false,
      },
      {
        source: "/lab/dashboard/on-demand-gpus",
        destination: "/lab/compute",
        permanent: false,
      },
      {
        source: "/lab/dashboard/on-demand-gpus/",
        destination: "/lab/compute",
        permanent: false,
      },
      {
        source: "/lab/dashboard/inference",
        destination: "/lab/inference",
        permanent: false,
      },
      {
        source: "/lab/dashboard/inference/",
        destination: "/lab/inference",
        permanent: false,
      },
      { source: "/lab/dashboard/billing", destination: "/lab/billing", permanent: false },
      { source: "/lab/dashboard/billing/", destination: "/lab/billing", permanent: false },
      { source: "/lab/dashboard/support", destination: "/lab/docs", permanent: false },
      { source: "/lab/dashboard/support/", destination: "/lab/docs", permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/favicon.ico", destination: "/favicon/favicon.ico" },
        {
          source: "/lab/router",
          destination: "/lab-router/index.html",
        },
        {
          source: "/lab/router/",
          destination: "/lab-router/index.html",
        },
      ],
      // After App Router pages so /lab/dashboard (React) wins over static scrapes.
      afterFiles: [
        {
          source: "/lab/dashboard/home/quickstart",
          destination: "/lab-dashboard/dashboard/home/quickstart/index.html",
        },
        { source: "/lab/dashboard/home", destination: "/lab-dashboard/index.html" },
        {
          source: "/lab/dashboard/:path+",
          destination: "/lab-dashboard/dashboard/:path+/index.html",
        },
      ],
    };
  },
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];
    const labDocs = [
      "/",
      "/lab",
      "/lab/:path*",
      "/lab-dashboard/:path*",
      "/lab-inference/:path*",
      "/lab-router/:path*",
      "/site-chrome.css",
      "/site-chrome.js",
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...labDocs.map((source) => ({ source, headers: noStore })),
    ];
  },
};

export default nextConfig;
