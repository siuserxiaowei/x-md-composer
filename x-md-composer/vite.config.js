import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.PAGES_BASE || process.env.BASE_PATH || "/",
});
