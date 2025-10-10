import type { inferProcedureInput } from "@trpc/server";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("Testing files router", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it("should return upload configuration for organization bucket", async () => {
		const input: inferProcedureInput<AppRouter["files"]["uploadConfig"]> = {
			organizationId: ctx.defaultOrg.id,
		};

		const result = await ctx.caller.files.uploadConfig(input);

		expect(result.success).toBe(true);
		expect(result.bucket).toBe(ctx.defaultOrg.id);
	});
});
