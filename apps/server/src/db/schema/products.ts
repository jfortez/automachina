import { relations, sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
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
		primaryImageUrl: text("primary_image_url"), // imagen principal cacheada
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
		url: text("url").notNull(),
		isPrimary: boolean("is_primary").default(false).notNull(),
		altText: text("alt_text"),
		sortOrder: integer("sort_order").default(0).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.productId, t.url)],
);
