# AGENTS.md

This file provides guidelines for AI coding agents working on the AutoMachina repository.

## Project Overview

AutoMachina is an ERP system with:
- **Backend**: Hono + tRPC + Drizzle ORM + PostgreSQL + Better Auth (in `apps/server`)
- **Frontend**: React + TanStack Router + TanStack Query + shadcn/ui (in `apps/web`)
- **Monorepo**: Turborepo + pnpm workspaces

## Build/Lint/Test Commands

### Root Level Commands
```bash
# Development
pnpm dev              # Start all dev servers
pnpm dev:web          # Start web app only
pnpm dev:server       # Start server only

# Build
pnpm build            # Build all packages
pnpm check-types      # Type-check all packages

# Linting & Formatting
pnpm check            # Run Biome linter with auto-fix
pnpm format           # Run Biome formatter

# Database (runs in apps/server)
pnpm db:start         # Start PostgreSQL in Docker
pnpm db:stop          # Stop PostgreSQL
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Drizzle migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed          # Seed database
pnpm db:reset         # Reset DB (down + up + push + seed)

# Testing
pnpm test:server      # Run all server tests
```

### Server-Specific Commands (apps/server)
```bash
cd apps/server

# Testing with Vitest
pnpm test                    # Run all tests
pnpm test -- --run          # Run tests once (CI mode)
pnpm test -- --run <pattern> # Run specific test file/pattern
pnpm test -- --run src/test/organization.test.ts  # Run single test file
pnpm test -- --run -t "test name" # Run tests matching name

# Development
pnpm dev                # Start dev server with hot reload
pnpm build              # Build for production
pnpm check-types        # TypeScript check
```

### Web-Specific Commands (apps/web)
```bash
cd apps/web

pnpm dev                # Start Vite dev server (port 3001)
pnpm build              # Build for production
pnpm check-types        # TypeScript check
```

## Code Style Guidelines

### Formatting
- **Formatter**: Biome (configured in `biome.json`)
- **Indent**: Tabs (not spaces)
- **Quotes**: Double quotes for JavaScript/TypeScript
- **Line endings**: LF
- Run `pnpm check` before committing

### Import Organization
Biome automatically organizes imports. Order:
1. External libraries (react, zod, etc.)
2. Internal absolute imports (`@/db`, `@/lib`, etc.)
3. Relative imports (`../`, `./`)

### TypeScript Conventions

#### Types & Interfaces
- Use `type` for object shapes, unions, intersections
- Use `interface` only when declaration merging is needed
- Export types from DTO files: `export type CreateOrgInput = z.infer<typeof createOrg>`

#### Naming Conventions
- **Files**: kebab-case (e.g., `organization.ts`, `inventory.test.ts`)
- **Components**: PascalCase (e.g., `UserCard.tsx`)
- **Functions**: camelCase (e.g., `getOrganizationById`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types/Interfaces**: PascalCase (e.g., `CreateOrgInput`)
- **Database tables**: snake_case in schema definitions
- **DTO schemas**: camelCase (e.g., `createOrg`, `updateProduct`)

#### Functions
- Use explicit return types for public API functions
- Prefer async/await over raw promises
- Destructure parameters when there are 2+ properties

### Error Handling

#### Backend (tRPC)
```typescript
import { TRPCError } from "@trpc/server";

// Use appropriate error codes
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Product not found",
});

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid quantity",
});

throw new TRPCError({
  code: "FORBIDDEN",
  message: "Access denied",
});
```

#### Common tRPC Error Codes
- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - No permission
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Resource already exists
- `INTERNAL_SERVER_ERROR` - Unexpected error

### DTOs (Data Transfer Objects)
- Define in `apps/server/src/dto/*.ts`
- Use Zod for validation schemas
- Export both schema and inferred type
- Example:
```typescript
import z from "zod";

const createProduct = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  price: z.number().positive(),
});

export { createProduct };
export type CreateProductInput = z.infer<typeof createProduct>;
```

### Database (Drizzle ORM)
- Schema files in `apps/server/src/db/schema/*.ts`
- Use `uuidPk` helper for primary keys
- Always include `organizationId` for multi-tenant tables
- Use transactions for multi-table operations
- Example query:
```typescript
const result = await db
  .select()
  .from(products)
  .where(and(
    eq(products.organizationId, orgId),
    eq(products.id, id)
  ))
  .limit(1);
```

### Testing
- Use Vitest with globals enabled
- Test files: `*.test.ts` in `apps/server/src/test/`
- Use `setupTestContext()` helper for test setup
- Access test globals via `globals` object
- Example:
```typescript
import { beforeAll, describe, expect, it } from "vitest";
import { setupTestContext, globals } from "./util";

describe("feature", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  beforeAll(async () => {
    ctx = await setupTestContext();
  });
  
  it("should work", async () => {
    // Test code
  });
});
```

### Security (Tenancy)
- Never trust `organizationId` from client input
- Always extract from session: `ctx.session.user.activeOrganizationId`
- Validate user membership in organization before operations
- All protected procedures enforce this automatically

### File Structure
```
apps/server/src/
├── db/
│   ├── schema/       # Drizzle table definitions
│   ├── seed/         # Seed data & scripts
│   └── index.ts      # Database connection
├── dto/              # Zod validation schemas
├── lib/              # Utilities (auth, s3, trpc)
├── routers/          # tRPC route definitions
├── services/         # Business logic
└── test/             # Test files
```

## Pre-commit Checklist
1. Run `pnpm check` to lint and format
2. Run `pnpm check-types` to verify TypeScript
3. Run tests for affected files: `pnpm test:server -- --run <pattern>`
4. Ensure no secrets or credentials in code
