/** @type {import('next').NextConfig} */
const nextConfig = {
  // The tutor page opens a live (billed) WebSocket session to Grok's realtime
  // voice API on mount — Strict Mode's double-invoke would open two per load.
  reactStrictMode: false,
};

module.exports = nextConfig;
