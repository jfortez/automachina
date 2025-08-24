import { pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { timestamps, uuidPk } from "./utils";

export const organizations = pgTable("organization", {
	id: uuidPk("id"),
	code: text("code").unique().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	...timestamps,
});

export const orgMembers = pgTable(
	"organization_members",
	{
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		userId: text("user_id")
			.references(() => user.id, { onDelete: "cascade" })
			.notNull(),
		...timestamps,
	},
	(t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);
