import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { uuidPk } from "./utils";

export const customers = pgTable(
	"customer",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id)
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		contactInfo: jsonb("contact_info").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);
