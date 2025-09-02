import type { inferProcedureInput } from "@trpc/server";
import { expect, test } from "vitest";
import { db } from "@/db";
import { productCategories } from "@/db/schema/products";
import { auth } from "@/lib/auth";
import { createContextInner } from "@/lib/context";
import type { AppRouter } from "@/routers";
import { createCaller } from "@/routers";

test("create a product", async () => {
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

	let firstCategory = await db.query.productCategories.findFirst();
	if (!firstCategory) {
		const [createdCategory] = await db
			.insert(productCategories)
			.values({
				code: "GENERAL",
				name: "General",
				organizationId: firstOrg.id,
			})
			.returning();
		firstCategory = createdCategory;
	}

	const input: inferProcedureInput<AppRouter["product"]["create"]> = {
		baseUom: "EA",
		name: "Foobar",
		price: 23.5,
		sku: "0123456",
		productUoms: [
			{
				uomCode: "EA",
				qtyInBase: "1",
			},
			{
				uomCode: "PK",
				qtyInBase: "6",
			},
			{
				uomCode: "BX",
				qtyInBase: "36",
			},
		],
		attributes: {
			foo: "bar",
		},
		organizationId: firstOrg.id,
		categoryId: firstCategory.id,
		trackingLevel: "none",
	};

	const createdProduct = await caller.product.create(input);

	console.log(createdProduct);

	expect(createdProduct).toMatchObject(input);
});
