import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import ora from "ora";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import * as productSchema from "../schema/products";
import * as uomSchema from "../schema/uom";
import * as warehouseSchema from "../schema/warehouse";
import { DEFAULT_USERS, UOM_CONVERSIONS, UOM_ITEMS } from "./data";

async function main() {
	const UNIQUE_ID = uuid();
	const db = drizzle(env.DATABASE_URL);
	const spinner = ora("Starting Seeding").start();

	let hasError = false;
	try {
		spinner.text = "Seeding UOM";

		await db.insert(uomSchema.uom).values(UOM_ITEMS);

		spinner.succeed("UOM seeded");

		spinner.text = "Seeding UOM Conversions";
		await db.insert(uomSchema.uomConversion).values(UOM_CONVERSIONS);
		spinner.succeed("UOM Conversions seeded");

		spinner.text = "Seeding Users";
		/* ==== PUBLIC SEED === */
		// THIS IS FOR TEST SUITES

		const userIds = await Promise.all(
			DEFAULT_USERS.map((user) => auth.api.signUpEmail({ body: user })),
		).then((result) => result.map((r) => r.user.id));

		spinner.succeed("Users seeded");

		spinner.text = "Seeding Organizations";

		const organization = await auth.api.createOrganization({
			body: {
				name: "PUBLIC ORGANIZATION",
				slug: "public-organization",
				userId: userIds[0],
				keepCurrentActiveOrganization: true,
			},
		});

		spinner.succeed("Organizations seeded");

		spinner.text = "Seeding Organization Members";

		const orgMember1 = await auth.api.addMember({
			body: {
				userId: userIds[1],
				role: ["member"], // required
				organizationId: organization!.id,
			},
		});

		spinner.succeed("Organization Members seeded");

		spinner.text = "Seeding for Warehouse";

		const [warehouse] = await db
			.insert(warehouseSchema.warehouses)
			.values([
				{
					id: UNIQUE_ID,
					code: "public",
					name: "Public Warehouse",
					organizationId: organization!.id,
					address: "Public Address Warehouse",
				},
			])
			.returning();

		await db.insert(warehouseSchema.locations).values({
			id: UNIQUE_ID,
			code: "public",
			type: "storage",
			warehouseId: warehouse.id,
		});

		spinner.succeed("Warehouse seeded");

		spinner.text = "Seeding for Price List";

		await db.insert(productSchema.priceList).values({
			id: UNIQUE_ID,
			code: "public",
			name: "Public Price List",
			organizationId: organization!.id,
			type: "public",
			currency: "USD",
		});

		spinner.succeed("Price List seeded");

		spinner.text = "Seeding Public Category for Products";

		const [publicCategory] = await db
			.insert(productSchema.productCategory)
			.values({
				id: UNIQUE_ID,
				code: "public",
				name: "Public Category",
				organizationId: organization!.id,
				description: "Public Category for Products",
			})
			.returning();

		const globals = {
			id: UNIQUE_ID,
			organization,
			warehouse,
			orgMembers: [organization?.members[0], orgMember1],
			productCategory: publicCategory,
		};

		fs.writeFileSync(
			path.join(__dirname, "..", "..", "test", "globals.ts"),
			`export const globals = ${JSON.stringify(globals, null, 2)};`,
		);
	} catch (error) {
		hasError = true;
		spinner.fail("Seeding Failed");
		spinner.stop();
		console.error(error);
	} finally {
		if (!hasError) {
			spinner.succeed("Seeding Completed");
			spinner.stop();
		}
	}
}

main();
