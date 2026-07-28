import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` is a Node-only driver with an optional native addon (`pg-native`).
  // Keep it external to the server bundle so Next doesn't try to bundle the
  // native bits — the repository layer (src/repositories/*) loads it at
  // runtime in the Node.js server runtime only.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
