import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// 本機開發 base="/"；GitHub Pages 由 CI 設 BASE_PATH=/倉庫名/
const base = process.env.BASE_PATH || "/";
const baseHref = base.endsWith("/") ? base : base + "/";

export default defineConfig(({ mode }) => ({
  base: baseHref,
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "inject-base",
      transformIndexHtml(html) {
        return html.replace(
          /<base href="[^"]*" data-inject \/>/,
          `<base href="${baseHref}" />`
        );
      },
    },
  ].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
