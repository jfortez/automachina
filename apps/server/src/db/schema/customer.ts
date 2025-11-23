import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { uuidPk } from "./utils";

export const customers = pgTable(
	"customer",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id)
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		contactInfo: jsonb("contact_info").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);
