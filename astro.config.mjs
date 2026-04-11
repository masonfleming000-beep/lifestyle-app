import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://www.hublifeapp.com", // 👈 add this
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

