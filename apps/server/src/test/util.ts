import type { Session, User } from "better-auth";
import type { organizations } from "@/db/schema/organizations";

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
	const caller = createCaller({
		session: {
			user: {} as User,
			session: {} as Session,
		},
	});

	return {
		caller,
		defaultOrg: globals.organization as unknown as TestContext["defaultOrg"],
		defaultCategoryId: globals.id,
		defaultWarehouseId: globals.warehouse.id,
		defaultCustomerId: "test-customer-id-" + Date.now(), // TODO: Create actual customer in tests
	};
}
