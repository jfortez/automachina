ALTER TABLE "accounts_receivable" ALTER COLUMN "amount_paid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ALTER COLUMN "discount_available" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ALTER COLUMN "discount_taken" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ALTER COLUMN "finance_charges" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_memo" ALTER COLUMN "applied_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_application" ALTER COLUMN "discount_taken" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_application" ALTER COLUMN "write_off_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "unapplied_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "exchange_rate" SET NOT NULL;