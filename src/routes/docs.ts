import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

const router = Router();

const swaggerFile = path.join(process.cwd(), "docs", "swagger", "openapi.json");
const postmanFile = path.join(process.cwd(), "docs", "postman", "school-saas.postman_collection.json");

router.get("/", async (_req, res) => {
  try {
    await fs.access(swaggerFile);

    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>School SaaS API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f5f7fb; font-family: ui-sans-serif, system-ui, sans-serif; }
      .topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #0f172a; color: #fff; }
      .topbar a { color: #93c5fd; text-decoration: none; margin-left: 16px; }
      #swagger-ui { max-width: 1280px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div>School SaaS API Docs</div>
      <div>
        <a href="/docs/openapi.json">OpenAPI JSON</a>
        <a href="/docs/postman-collection.json">Postman Collection</a>
      </div>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/docs/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`);
  } catch {
    res.status(503).json({
      error: "API docs have not been generated yet. Run `npm run docs:generate` in smp-server.",
    });
  }
});

router.get("/openapi.json", async (_req, res, next) => {
  try {
    const contents = await fs.readFile(swaggerFile, "utf8");
    res.type("application/json").send(contents);
  } catch (error) {
    next(error);
  }
});

router.get("/postman-collection.json", async (_req, res, next) => {
  try {
    const contents = await fs.readFile(postmanFile, "utf8");
    res.setHeader("Content-Disposition", 'attachment; filename="school-saas.postman_collection.json"');
    res.type("application/json").send(contents);
  } catch (error) {
    next(error);
  }
});

export default router;
