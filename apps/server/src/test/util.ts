import type { Session, User } from "better-auth";
import type { organizations } from "@/db/schema/organizations";

import { createCaller } from "@/routers";
import { globals } from "./globals";

export interface TestContext {
	caller: ReturnType<typeof createCaller>;
	defaultCategoryId: string;
	defaultOrg: typeof organizations.$inferSelect;
}

export async function setupTestContext(): Promise<TestContext> {
	// Autenticación
	// const session = await auth.api.signInEmail({
	//   body: { email: "rylan_reichel@yahoo.com", password: "password" },
	//   returnHeaders: true,
	// });

	// Crear caller
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
	};
}
