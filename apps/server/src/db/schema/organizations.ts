import { relations } from "drizzle-orm";
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

export const orgRelations = relations(organizations, ({ many }) => ({
	members: many(orgMembers),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
	organization: one(organizations, {
		fields: [orgMembers.organizationId],
		references: [organizations.id],
	}),
	user: one(user, {
		fields: [orgMembers.userId],
		references: [user.id],
	}),
}));
