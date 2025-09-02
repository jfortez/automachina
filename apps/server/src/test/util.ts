import { createAuthClient } from "better-auth/client";
import { test as baseTest } from "vitest";
import { env } from "@/lib/env";

export const test = baseTest.extend<{
	auth: { client: ReturnType<typeof createAuthClient> };
}>({
	auth: (_, use) =>
		use({
			client: createAuthClient({
				baseURL: env.BETTER_AUTH_URL,
				basePath: "/auth",
			}),
		}),
});
