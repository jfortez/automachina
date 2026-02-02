import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { customers } from "./customer";
import { uom } from "./uom";
import { timestamps, uuidPk } from "./utils";

// Categorías de producto
export const productCategory = pgTable(
	"product_category",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		description: text("description"),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

// Productos principales
export const product = pgTable(
	"product",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		sku: text("sku").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		categoryId: uuid("category_id").references(() => productCategory.id),
		baseUom: text("base_uom")
			.references(() => uom.code, { onDelete: "restrict" })
			.notNull(),
		trackingLevel: text("tracking_level", {
			enum: ["none", "lot", "serial", "lot+serial"],
		}).notNull(),
		perishable: boolean("perishable").default(false).notNull(),
		shelfLifeDays: integer("shelf_life_days"),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		productFamilyId: uuid("product_family_id").references(
			() => productFamily.id,
			{
				onDelete: "set null",
			},
		),
		parentId: uuid("parent_id").references((): AnyPgColumn => product.id, {
			onDelete: "set null",
		}),
		suggestedRetailPrice: numeric("suggested_retail_price", {
			precision: 28,
			scale: 9,
		}),
		defaultCost: numeric("default_cost", { precision: 28, scale: 9 }),
		defaultCurrency: text("default_currency").notNull().default("USD"),
		isPhysical: boolean("is_physical").default(true).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.sku)],
);

export const productRelations = relations(product, ({ one, many }) => ({
	category: one(productCategory, {
		fields: [product.categoryId],
		references: [productCategory.id],
	}),
	images: many(productImages),
	organization: one(organization, {
		fields: [product.organizationId],
		references: [organization.id],
	}),
	productFamily: one(productFamily, {
		fields: [product.productFamilyId],
		references: [productFamily.id],
	}),
	identifiers: many(productIdentifiers),
	uoms: many(productUom),
	prices: many(productPrice),
}));

export const productCategoryRelations = relations(
	productCategory,
	({ one, many }) => ({
		organization: one(organization),
		products: many(product),
	}),
);

// Identificadores externos: GTIN, EAN, UPC, etc.
export const productIdentifiers = pgTable(
	"product_identifier",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
			.notNull(),
		type: text("type").notNull(), // GTIN','EAN','UPC','NDC','CAS','SKU_SUPPLIER','CUSTOM', etc.
		value: text("value").notNull(),
		uomCode: text("uom_code").references(() => uom.code),
	},
	(t) => [unique().on(t.type, t.value)],
);

// Presentaciones y empaques válidos
export const productUom = pgTable(
	"product_uom",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
			.notNull(),
		uomCode: text("uom_code")
			.references(() => uom.code, { onDelete: "restrict" })
			.notNull(),
		qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
		isBase: boolean("is_base").default(false).notNull(),
	},
	(t) => [unique().on(t.productId, t.uomCode)],
);

// Imágenes de productos
export const productImages = pgTable(
	"product_image",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
			.notNull(),
		productFamilyId: uuid("product_family_id").references(
			() => productFamily.id,
			{
				onDelete: "cascade",
			},
		),
		url: text("url").notNull(), //s3 or <url>
		isPrimary: boolean("is_primary").default(false).notNull(),
		altText: text("alt_text"),
		sortOrder: integer("sort_order").default(0).notNull(),
		mime: text("mime"),
		width: integer("width").notNull(),
		height: integer("height").notNull(),
		metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [
		unique().on(t.productId, t.url),
		index().on(t.productId, t.sortOrder),
	],
);

export const productFamily = pgTable(
	"product_family",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code"),
		name: text("name").notNull(),
		variationTheme: text("variation_theme"), //size,color,pack_count
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const priceListTypes = [
	"public",
	"customer",
	"promotional",
	"internal",
] as const;

export type DiscountConditions = {
	minQty?: number;
	maxQty?: number;
	uomCodes?: string[];
	minOrderTotal?: number;
	daysOfWeek?: string[];
	tiers?: Array<{
		minQty: number;
		maxQty?: number;
		discount: number;
		type: "percentage" | "fixed";
	}>;
};

export const discountTypes = [
	"percentage",
	"fixed",
	"volume",
	"bogo",
	"tiered",
] as const;

export const discountAppliesTo = [
	"product",
	"category",
	"price_list",
	"customer",
	"global",
] as const;

export const priceList = pgTable(
	"price_list",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		type: text("type", { enum: priceListTypes }).notNull(),
		currency: text("currency"),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const productPrice = pgTable(
	"product_price",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
			.notNull(),
		priceListId: uuid("price_list_id").references(() => priceList.id, {
			onDelete: "set null",
		}),
		customerId: uuid("customer_id").references(() => customers.id, {
			onDelete: "set null",
		}),
		uomCode: text("uom_code")
			.references(() => uom.code, { onDelete: "cascade" })
			.notNull(),
		price: numeric("price", { precision: 18, scale: 6 }).notNull(),
		currency: text("currency").notNull().default("USD"),
		minQty: numeric("min_qty", { precision: 28, scale: 9 })
			.notNull()
			.default("1"),
		effectiveFrom: timestamp("effective_from"),
		effectiveTo: timestamp("effective_to"),
		isActive: boolean("is_active").notNull().default(true),
		...timestamps,
	},
	(t) => [
		unique().on(t.productId, t.priceListId, t.customerId, t.uomCode),
		check("check_price", sql`(${t.price} >= 0) `),
	],
);

export const discountRule = pgTable(
	"discount_rule",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		type: text("type", { enum: discountTypes }).notNull(),
		value: numeric("value", { precision: 18, scale: 6 }).notNull(),
		currency: text("currency").notNull().default("USD"),
		appliesTo: text("applies_to", { enum: discountAppliesTo }).notNull(),
		appliesToId: uuid("applies_to_id"),
		conditions: jsonb("conditions")
			.$type<DiscountConditions>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		combinable: boolean("combinable").notNull().default(false),
		startAt: timestamp("start_at"),
		endAt: timestamp("end_at"),
		maxUses: integer("max_uses"),
		usedCount: integer("used_count").notNull().default(0),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index().on(t.organizationId)],
);

// Relations for all tables (defined after all tables to avoid forward reference issues)

export const productFamilyRelations = relations(
	productFamily,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [productFamily.organizationId],
			references: [organization.id],
		}),
		products: many(product),
		images: many(productImages),
	}),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
	product: one(product, {
		fields: [productImages.productId],
		references: [product.id],
	}),
	productFamily: one(productFamily, {
		fields: [productImages.productFamilyId],
		references: [productFamily.id],
	}),
}));

export const productIdentifiersRelations = relations(
	productIdentifiers,
	({ one }) => ({
		product: one(product, {
			fields: [productIdentifiers.productId],
			references: [product.id],
		}),
		uom: one(uom, {
			fields: [productIdentifiers.uomCode],
			references: [uom.code],
		}),
	}),
);

export const productUomRelations = relations(productUom, ({ one }) => ({
	product: one(product, {
		fields: [productUom.productId],
		references: [product.id],
	}),
	uom: one(uom, {
		fields: [productUom.uomCode],
		references: [uom.code],
	}),
}));

export const priceListRelations = relations(priceList, ({ one, many }) => ({
	organization: one(organization, {
		fields: [priceList.organizationId],
		references: [organization.id],
	}),
	prices: many(productPrice),
}));

export const productPriceRelations = relations(productPrice, ({ one }) => ({
	product: one(product, {
		fields: [productPrice.productId],
		references: [product.id],
	}),
	priceList: one(priceList, {
		fields: [productPrice.priceListId],
		references: [priceList.id],
	}),
	customer: one(customers, {
		fields: [productPrice.customerId],
		references: [customers.id],
	}),
	uom: one(uom, {
		fields: [productPrice.uomCode],
		references: [uom.code],
	}),
}));

export const discountRuleRelations = relations(discountRule, ({ one }) => ({
	organization: one(organization, {
		fields: [discountRule.organizationId],
		references: [organization.id],
	}),
}));
