import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};
const { withNetlify } = require('@netlify/next');
module.exports = withNetlify({});

export default nextConfig;
