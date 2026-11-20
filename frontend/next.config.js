/** The browser only talks to Next (same origin); /api/* is proxied to the Express API. */
const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";
module.exports = {
  reactStrictMode: true,
  async rewrites() { return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }]; },
};
