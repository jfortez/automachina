import type { inferProcedureInput } from "@trpc/server";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("test customer router", async () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it("should create a customer", async () => {
		const firstOrg = await db.query.organizations.findFirst();
		if (!firstOrg) {
			throw new Error("No organization found");
		}

		const input: inferProcedureInput<AppRouter["customer"]["create"]> = {
			code: "foobar",
			name: "Foobar",
			organizationId: firstOrg.id,
		};

		const [createdCustomer] = await ctx.caller.customer.create(input);

		const customerById = await ctx.caller.customer.getById(createdCustomer.id);

		expect(customerById).toMatchObject(input);
	});
});
