/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Qloo response cache ships with the deployment so judging never depends on a cold API.
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./data/**/*"],
      "/**/*": ["./data/**/*"],
    },
  },
};

export default nextConfig;
