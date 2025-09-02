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
import { customers } from "./customer";
import { organizations } from "./organizations";
import { uom } from "./uom";
import { timestamps, uuidPk } from "./utils";

// Categorías de producto
export const productCategories = pgTable(
	"product_category",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

// Productos principales
export const products = pgTable(
	"product",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		sku: text("sku").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		categoryId: uuid("category_id").references(() => productCategories.id),
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
		parentId: uuid("parent_id").references((): AnyPgColumn => products.id, {
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

export const productRelations = relations(products, ({ one, many }) => ({
	category: one(productCategories),
	images: many(productImages),
	organization: one(organizations),
}));

export const productCategoryRelations = relations(
	productCategories,
	({ one, many }) => ({
		organization: one(organizations),
		products: many(products),
	}),
);

// Identificadores externos: GTIN, EAN, UPC, etc.
export const productIdentifiers = pgTable(
	"product_identifier",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => products.id, { onDelete: "cascade" })
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
			.references(() => products.id, { onDelete: "cascade" })
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
			.references(() => products.id, { onDelete: "cascade" })
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
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code"),
		name: text("name").notNull(),
		variationTheme: text("variation_theme"), //size,color,pack_count
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const priceList = pgTable(
	"price_list",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		type: text("type").notNull(),
		currency: text("currency"),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [
		unique().on(t.organizationId, t.code),
		check(
			"check_type",
			sql`(${t.type} IN ('public','customer','promotional','internal'))`,
		),
	],
);

export const productPrice = pgTable(
	"product_price",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => products.id, { onDelete: "cascade" })
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

/**
 * CREATE TABLE IF NOT EXISTS discount_rule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('percentage','fixed','volume','bogo','tiered')),
  value           numeric(18,6) NOT NULL, -- porcentaje (0-100) o monto fijo según type
  currency        text,
  applies_to      text NOT NULL CHECK (applies_to IN ('product','category','price_list','global')),
  applies_to_id   uuid, -- id del producto, product_category o price_list según applies_to (vale NULL para global)
  conditions      jsonb NOT NULL DEFAULT '{}'::jsonb, -- ex: {"min_qty":10}
  combinable      boolean NOT NULL DEFAULT false,
  start_at        timestamptz,
  end_at          timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_discount_rule_org ON discount_rule(organization_id);

 */

export const discountRule = pgTable(
	"discount_rule",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		type: text("type").notNull(),
		value: numeric("value", { precision: 18, scale: 6 }).notNull(),
		currency: text("currency"),
		appliesTo: text("applies_to").notNull(),
		appliesToId: uuid("applies_to_id"),
		conditions: jsonb("conditions").notNull().default(sql`'{}'::jsonb`),
		combinable: boolean("combinable").notNull().default(false),
		startAt: timestamp("start_at"),
		endAt: timestamp("end_at"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		check(
			"check_type",
			sql`${t.type} IN ('percentage','fixed','volume','bogo','tiered')`,
		),
		check(
			"check_applies_to",
			sql`${t.appliesTo} IN ('product','category','price_list','global')`,
		),
		index().on(t.organizationId),
	],
);
