import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  security: {
    allowedDomains: [
      { protocol: "https", hostname: "www.hublifeapp.com" },
      { protocol: "https", hostname: "hublifeapp.com" },
    ],
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});