import { faker as f } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import ora from "ora";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import * as orgSchema from "./schema/organizations";

async function main() {
	const db = drizzle(env.DATABASE_URL);
	const spinner = ora("Starting Seeding").start();

	try {
		spinner.text = "Seeding Users";
		const DEFAULT_USERS = [
			{
				email: f.internet.email(),
				password: "password",
				name: f.person.fullName(),
			},
			{
				email: f.internet.email(),
				password: "password",
				name: f.person.fullName(),
			},
		];

		const userIds = await Promise.all(
			DEFAULT_USERS.map((user) => auth.api.signUpEmail({ body: user })),
		).then((result) => result.map((r) => r.user.id));

		spinner.succeed("Users seeded");

		spinner.text = "Seeding Organizations";

		const ORGANIZATIONS: (typeof orgSchema.organizations.$inferInsert)[] = [
			{
				code: "sample",
				name: "Sample Organization",
				description: "Sample Description",
			},
		];

		spinner.succeed("Organizations seeded");

		const organization = await db
			.insert(orgSchema.organizations)
			.values(ORGANIZATIONS)
			.returning();

		spinner.text = "Seeding Organization Members";

		const ORGANIZATION_MEMBERS: (typeof orgSchema.orgMembers.$inferInsert)[] = [
			{
				organizationId: organization[0].id,
				userId: userIds[0],
			},
			{
				organizationId: organization[0].id,
				userId: userIds[1],
			},
		];

		await db.insert(orgSchema.orgMembers).values(ORGANIZATION_MEMBERS);

		spinner.succeed("Organization Members seeded");

		spinner.succeed("Seeding Completed");
	} catch (error) {
		spinner.fail("Seeding Failed");
		console.error(error);
	}
}

main();
