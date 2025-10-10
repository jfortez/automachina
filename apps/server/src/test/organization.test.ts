import type { inferProcedureInput } from "@trpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { priceList, productCategory } from "@/db/schema/products";
import { locations, warehouses } from "@/db/schema/warehouse";
import { findBucket } from "@/lib/s3";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("Testing organization", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it("should create organization with all defaults", async () => {
		const orgInput: inferProcedureInput<AppRouter["organization"]["create"]> = {
			code: nanoid(10),
			name: "Test Organization for Defaults",
			description: "Organization created to test default data creation",
		};

		const createdOrg = await ctx.caller.organization.create(orgInput);

		expect(createdOrg).toHaveLength(1);
		const orgId = createdOrg[0].id;

		// Verify warehouse was created
		const warehouseResult = await db
			.select()
			.from(warehouses)
			.where(eq(warehouses.organizationId, orgId));

		expect(warehouseResult).toHaveLength(1);
		expect(warehouseResult[0].code).toBe("default");
		expect(warehouseResult[0].name).toBe("Default Warehouse");

		// Verify warehouse location was created
		const locationResult = await db
			.select()
			.from(locations)
			.where(eq(locations.warehouseId, warehouseResult[0].id));

		expect(locationResult).toHaveLength(1);
		expect(locationResult[0].code).toBe("storage");
		expect(locationResult[0].type).toBe("storage");

		// Verify price list was created
		const priceListResult = await db
			.select()
			.from(priceList)
			.where(eq(priceList.organizationId, orgId));

		expect(priceListResult).toHaveLength(1);
		expect(priceListResult[0].code).toBe("default");
		expect(priceListResult[0].name).toBe("Default Price List");
		expect(priceListResult[0].type).toBe("public");
		expect(priceListResult[0].currency).toBe("USD");

		// Verify product category was created
		const categoryResult = await db
			.select()
			.from(productCategory)
			.where(eq(productCategory.organizationId, orgId));

		expect(categoryResult).toHaveLength(1);
		expect(categoryResult[0].code).toBe("general");
		expect(categoryResult[0].name).toBe("General");
		expect(categoryResult[0].description).toBe("Default general category");

		const orgBucket = await findBucket(`org-${orgId}`);

		expect(orgBucket).toBeTruthy();
		expect(orgBucket?.Name).toBe(`org-${orgId}`);
	});
});
