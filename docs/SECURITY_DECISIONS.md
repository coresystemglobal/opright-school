# Security Decisions

## Tenant Isolation and `withTenant`

As of 2026-04-30, the runtime tenant-isolation decision is:

- Primary enforcement is application-level tenant scoping with explicit `tenantId` filters.
- `withTenant(tenantId, fn)` is a Prisma-extension helper that injects tenant predicates into supported model queries inside `fn`.
- The backend does not currently rely on PostgreSQL session state or blanket RLS enforcement for normal request handling.

This repo still contains legacy RLS migrations and older documentation that describe `set_config('app.current_tenant', ...)` and database-level RLS as the active mechanism. That is no longer the effective runtime contract for `withTenant`.

Practical rule:

- If a code path uses `withTenant`, every tenant-sensitive Prisma call must go through the scoped client passed to the callback.
- If a code path does not use `withTenant`, it must continue to apply explicit `tenantId` filters itself.
