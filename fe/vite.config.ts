import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 8080,
    strictPort: true,
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
  resolve: { tsconfigPaths: true },
});
