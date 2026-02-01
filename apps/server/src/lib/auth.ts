import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { organizationService } from "@/services/organization";
import { db } from "../db";
import * as schema from "../db/schema/auth";
import env from "./env";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN || "", "my-better-t-app://"],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					const organization = await organizationService.getActiveOrganization(
						session.userId,
					);
					return {
						data: {
							...session,
							activeOrganizationId: organization?.id || null,
						},
					};
				},
			},
		},
	},
	plugins: [expo(), organization()],
});

export type Session = typeof auth.$Infer.Session;
