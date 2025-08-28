import type { inferProcedureInput } from "@trpc/server";
import { expect, test } from "vitest";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { createContextInner } from "@/lib/context";
import type { AppRouter } from "@/routers";
import { createCaller } from "@/routers";

test("add and get post", async () => {
	const session = await auth.api.signInEmail({
		body: { email: "rylan_reichel@yahoo.com", password: "password" },
		returnHeaders: true,
	});

	const ctx = await createContextInner({ headers: session.headers });
	const caller = createCaller(ctx);

	const firstOrg = await db.query.organizations.findFirst();
	if (!firstOrg) {
		throw new Error("No organization found");
	}

	const input: inferProcedureInput<AppRouter["customer"]["create"]> = {
		code: "foobar",
		name: "Foobar",
		organizationId: firstOrg.id,
	};

	const [createdCustomer] = await caller.customer.create(input);

	const customerById = await caller.customer.getById(createdCustomer.id);

	expect(customerById).toMatchObject(input);
});
