import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./backend/routes/api.js";
import { verifyConfig } from "./backend/config/index.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Verify runtime configuration for the optional Express wrapper.
  verifyConfig();

  // Mount API endpoints
  app.use("/api", apiRouter);

  // Serve static assets or use Vite dev server
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    console.log("Entering Development Mode: Spawning Vite Hot Module Proxy Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Entering Production Mode: Readying Static Files and Assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.use(
      express.static(distPath, {
        maxAge: "1h",
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Adviso AI DB Engine Client Loaded] Services active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("CRITICAL: Failed to launch full stack server wrapper:", error);
  process.exit(1);
});
