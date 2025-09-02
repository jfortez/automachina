import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	numeric,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { timestamps } from "./utils";

export const uom = pgTable(
	"uom",
	{
		code: text("code").primaryKey(),
		name: text("name").notNull(),
		system: text("system").notNull(), // UNECE o UCUM
		category: text("category").notNull(), // count','mass','volume','length','area','time','other'
		isPackaging: boolean("is_packaging").default(false).notNull(),
		...timestamps,
	},
	(t) => [check("check_system", sql`${t.system} in ('UNECE','UCUM')`)],
);

export const uomConversion = pgTable(
	"uom_conversion",
	{
		fromUom: text("from_uom")
			.references(() => uom.code, { onDelete: "restrict", onUpdate: "cascade" })
			.notNull(),
		toUom: text("to_uom")
			.references(() => uom.code, { onDelete: "restrict", onUpdate: "cascade" })
			.notNull(),
		factor: numeric("factor", { precision: 28, scale: 12 }).notNull(),
	},
	(table) => [
		check("check_uom_conversion", sql`${table.fromUom} <> ${table.toUom}`),
		primaryKey({ columns: [table.fromUom, table.toUom] }),
	],
);
