import { Request, Response, NextFunction } from "express";
import { auditService } from "../modules/audit/service";

const AUDITED_ROLES = new Set(["ADMIN", "PRINCIPAL", "TEACHER", "STAFF", "MASTER"]);
const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SKIP_PATTERNS = [
  /^\/auth\//,
  /^\/notifications\//,
  /^\/queue\//,
  /\/progress$/,
];

function deriveAction(method: string, path: string): { action: string; entity?: string } {
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);
  const resource = segments[0] ?? "unknown";

  const verb =
    method === "POST" ? "create" :
    method === "PUT" || method === "PATCH" ? "update" :
    method === "DELETE" ? "delete" : "action";

  const sub = segments.length >= 3 ? segments[2] : null;
  const action = sub && !/^[0-9a-f-]{20,}$/i.test(sub)
    ? `${resource}.${sub}.${verb}`
    : `${resource}.${verb}`;

  const entity = resource.charAt(0).toUpperCase() + resource.slice(1);
  return { action, entity };
}

function extractEntityId(path: string): string | undefined {
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);
  const candidate = segments[1];
  if (candidate && /^[0-9a-f-]{20,}$/i.test(candidate)) return candidate;
  return undefined;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!AUDITED_METHODS.has(req.method)) return next();
  if (!req.user || !AUDITED_ROLES.has(req.user.role)) return next();
  if (SKIP_PATTERNS.some((p) => p.test(req.path))) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const { action, entity } = deriveAction(req.method, req.path);
    const entityId = extractEntityId(req.path);

    auditService.log({
      tenantId: req.tenantId!,
      userId: req.user!.userId,
      action,
      entity,
      entityId,
      meta: req.method === "DELETE" ? undefined : sanitiseBody(req.body),
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip,
    });
  });

  next();
}

function sanitiseBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (/password|secret|token|key/i.test(k)) {
      clone[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 500) {
      clone[k] = v.slice(0, 500) + "…";
    } else {
      clone[k] = v;
    }
  }
  return Object.keys(clone).length ? clone : undefined;
}
