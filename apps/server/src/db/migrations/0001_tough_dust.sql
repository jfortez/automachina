ALTER TABLE "discount_rule" ADD COLUMN "max_uses" integer;--> statement-breakpoint
ALTER TABLE "discount_rule" ADD COLUMN "used_count" integer DEFAULT 0 NOT NULL;