import type { organization } from "@/db/schema/auth";
import { DEFAULT_USERS } from "@/db/seed/data";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createCaller } from "@/routers";
import { globals } from "./_globals";

export interface TestContext {
	caller: ReturnType<typeof createCaller>;
	defaultCategoryId: string;
	defaultOrg: typeof organization.$inferSelect;
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
			session: {
				id: crypto.randomUUID(),
				userId: user.id,
				token: "mock-token",
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				activeOrganizationId: globals.organization.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		},
		logger: logger.child({ test: true }),
	});

	return {
		caller,
		defaultOrg: globals.organization as unknown as TestContext["defaultOrg"],
		defaultCategoryId: globals.id,
		defaultWarehouseId: globals.warehouse.id,
		defaultCustomerId: `test-customer-id-${Date.now()}`,
	};
}

export function formatNumeric(value: number, scale = 6): string {
	return value.toFixed(scale);
}
