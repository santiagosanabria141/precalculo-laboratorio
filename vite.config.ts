import { defineConfig } from "vite";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  base: isGitHubPages ? "/precalculo-laboratorio/" : "/",
});
