import { pgTable, text } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./utils";

export const organizations = pgTable("organization", {
	id: uuidPk("id"),
	code: text("code").unique().notNull(),
	name: text("name").notNull(),
	...timestamps,
});
