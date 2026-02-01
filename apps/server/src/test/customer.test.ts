import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("test customer router", async () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it("should create a customer", async () => {
		const input: inferProcedureInput<AppRouter["customer"]["create"]> = {
			code: nanoid(10),
			name: "Foobar",
		};

		const [createdCustomer] = await ctx.caller.customer.create(input);

		const customerById = await ctx.caller.customer.getById(createdCustomer.id);

		expect(customerById).toMatchObject(input);
	});
});
