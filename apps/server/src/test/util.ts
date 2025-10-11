import type { Session } from "better-auth";
import type { organizations } from "@/db/schema/organizations";
import { DEFAULT_USERS } from "@/db/seed/data";
import { auth } from "@/lib/auth";
import { createCaller } from "@/routers";
import { globals } from "./globals";

export interface TestContext {
	caller: ReturnType<typeof createCaller>;
	defaultCategoryId: string;
	defaultOrg: typeof organizations.$inferSelect;
	defaultWarehouseId: string;
	defaultCustomerId: string;
}

export async function setupTestContext(): Promise<TestContext> {
	const { user } = await auth.api.signInEmail({
		body: {
			email: DEFAULT_USERS[0].email,
			password: DEFAULT_USERS[0].password,
		},
	});
	const caller = createCaller({
		session: {
			user,
			session: {} as Session,
		},
	});

	return {
		caller,
		defaultOrg: globals.organization as unknown as TestContext["defaultOrg"],
		defaultCategoryId: globals.id,
		defaultWarehouseId: globals.warehouse.id,
		defaultCustomerId: `test-customer-id-${Date.now()}`, // TODO: Create actual customer in tests
	};
}
