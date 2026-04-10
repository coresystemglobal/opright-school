import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../utils/errors";

const swaggerFile = path.join(process.cwd(), "docs", "swagger", "openapi.json");
const postmanFile = path.join(process.cwd(), "docs", "postman", "school-saas.postman_collection.json");

export class DocsService {
  async getIndexPage() {
    try {
      await fs.access(swaggerFile);
      return this.buildIndexHtml();
    } catch {
      throw new AppError(
        503,
        "API docs have not been generated yet. Run `npm run docs:generate` in smp-server."
      );
    }
  }

  async getOpenApiJson() {
    return fs.readFile(swaggerFile, "utf8");
  }

  async getPostmanCollection() {
    return fs.readFile(postmanFile, "utf8");
  }

  private buildIndexHtml() {
    return `<!doctype html>
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
</html>`;
  }
}
