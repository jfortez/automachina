CREATE TABLE "accounts_receivable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_number" text NOT NULL,
	"document_type" text DEFAULT 'invoice' NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_id" uuid,
	"commercial_document_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"original_amount" numeric(18, 2) NOT NULL,
	"amount_paid" numeric(18, 2) DEFAULT '0',
	"amount_remaining" numeric(18, 2) NOT NULL,
	"discount_available" numeric(18, 2) DEFAULT '0',
	"discount_due_date" text,
	"discount_taken" numeric(18, 2) DEFAULT '0',
	"finance_charges" numeric(18, 2) DEFAULT '0',
	"document_date" text NOT NULL,
	"due_date" text NOT NULL,
	"paid_at" text,
	"overdue_since" text,
	"aging_bucket" text,
	"description" text,
	"reference" text,
	"is_disputed" boolean DEFAULT false,
	"dispute_reason" text,
	"dispute_date" text,
	"collection_status" text DEFAULT 'normal' NOT NULL,
	"last_reminder_date" text,
	"reminder_count" integer DEFAULT 0,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_receivable_organization_id_document_number_unique" UNIQUE("organization_id","document_number")
);
--> statement-breakpoint
CREATE TABLE "collection_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"ar_id" uuid,
	"activity_type" text NOT NULL,
	"activity_date" text NOT NULL,
	"contact_name" text,
	"contact_method" text,
	"promised_amount" numeric(18, 2),
	"promised_date" text,
	"promise_kept" boolean,
	"subject" text,
	"notes" text,
	"follow_up_date" text,
	"follow_up_completed" boolean DEFAULT false,
	"assigned_to" text,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_memo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"original_ar_id" uuid,
	"reason_code" text NOT NULL,
	"reason_description" text,
	"total_amount" numeric(18, 2) NOT NULL,
	"applied_amount" numeric(18, 2) DEFAULT '0',
	"remaining_amount" numeric(18, 2) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"refund_method" text,
	"refund_reference" text,
	"refunded_at" text,
	"document_date" text NOT NULL,
	"expiration_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_memo_organization_id_document_number_unique" UNIQUE("organization_id","document_number")
);
--> statement-breakpoint
CREATE TABLE "payment_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"ar_id" uuid NOT NULL,
	"amount_applied" numeric(18, 2) NOT NULL,
	"discount_taken" numeric(18, 2) DEFAULT '0',
	"write_off_amount" numeric(18, 2) DEFAULT '0',
	"applied_at" text NOT NULL,
	"applied_by" text NOT NULL,
	"is_reversed" boolean DEFAULT false,
	"reversed_at" text,
	"reversal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_number" text NOT NULL,
	"payment_date" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"payment_method" text NOT NULL,
	"payment_method_details" jsonb DEFAULT '{}'::jsonb,
	"total_amount" numeric(18, 2) NOT NULL,
	"unapplied_amount" numeric(18, 2) DEFAULT '0',
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(18, 6) DEFAULT '1',
	"status" text DEFAULT 'posted' NOT NULL,
	"deposit_account_id" text,
	"deposit_date" text,
	"notes" text,
	"created_by" text NOT NULL,
	"voided_by" text,
	"voided_at" text,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_organization_id_payment_number_unique" UNIQUE("organization_id","payment_number")
);
--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "credit_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "credit_limit" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "current_balance" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "payment_terms" text DEFAULT 'net_30';--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "payment_terms_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "early_payment_discount_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "early_payment_discount_days" integer;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "finance_charge_pct" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "credit_approved_by" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "credit_approved_at" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "credit_approval_notes" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "risk_level" text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "last_payment_date" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "last_payment_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "average_days_to_pay" integer;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "consolidate_invoices" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "consolidation_frequency" text;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_invoice_id_commercial_document_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."commercial_document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_commercial_document_id_commercial_document_id_fk" FOREIGN KEY ("commercial_document_id") REFERENCES "public"."commercial_document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_activity" ADD CONSTRAINT "collection_activity_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_activity" ADD CONSTRAINT "collection_activity_ar_id_accounts_receivable_id_fk" FOREIGN KEY ("ar_id") REFERENCES "public"."accounts_receivable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_memo" ADD CONSTRAINT "credit_memo_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_memo" ADD CONSTRAINT "credit_memo_original_ar_id_accounts_receivable_id_fk" FOREIGN KEY ("original_ar_id") REFERENCES "public"."accounts_receivable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_application" ADD CONSTRAINT "payment_application_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_application" ADD CONSTRAINT "payment_application_ar_id_accounts_receivable_id_fk" FOREIGN KEY ("ar_id") REFERENCES "public"."accounts_receivable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_receivable_customer_id_status_index" ON "accounts_receivable" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "accounts_receivable_due_date_index" ON "accounts_receivable" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "accounts_receivable_aging_bucket_index" ON "accounts_receivable" USING btree ("aging_bucket");--> statement-breakpoint
CREATE INDEX "accounts_receivable_status_index" ON "accounts_receivable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collection_activity_customer_id_index" ON "collection_activity" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "collection_activity_ar_id_index" ON "collection_activity" USING btree ("ar_id");--> statement-breakpoint
CREATE INDEX "collection_activity_activity_date_index" ON "collection_activity" USING btree ("activity_date");--> statement-breakpoint
CREATE INDEX "payment_application_payment_id_index" ON "payment_application" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_application_ar_id_index" ON "payment_application" USING btree ("ar_id");