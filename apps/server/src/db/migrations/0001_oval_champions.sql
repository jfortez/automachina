CREATE TABLE "commercial_document_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(28, 9) NOT NULL,
	"uom_code" text,
	"unit_price" numeric(18, 6) NOT NULL,
	"discount_percent" numeric(6, 2) DEFAULT '0',
	"discount_amount" numeric(18, 6) DEFAULT '0',
	"tax_percent" numeric(6, 2) DEFAULT '0',
	"tax_amount" numeric(18, 6) DEFAULT '0',
	"line_total" numeric(18, 6) NOT NULL,
	"reference_line_id" text,
	"line_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"series" text DEFAULT '001' NOT NULL,
	"authorization_number" text,
	"electronic_status" text DEFAULT 'not_applicable',
	"authorization_date" text,
	"issue_date" text NOT NULL,
	"due_date" text,
	"customer_id" text,
	"supplier_id" text,
	"reference_document_id" text,
	"reference_document_number" text,
	"reason_code" text,
	"reason_description" text,
	"subtotal" numeric(18, 2) NOT NULL,
	"discount_total" numeric(18, 2) DEFAULT '0',
	"tax_total" numeric(18, 2) DEFAULT '0',
	"total" numeric(18, 2) NOT NULL,
	"tax_breakdown" jsonb DEFAULT '[]'::jsonb,
	"discount_breakdown" jsonb DEFAULT '[]'::jsonb,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"transport_info" jsonb DEFAULT '{}'::jsonb,
	"xml_content" text,
	"pdf_url" text,
	"reference_number" text,
	"order_id" text,
	"notes" text,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_document_organization_id_document_type_document_number_unique" UNIQUE("organization_id","document_type","document_number")
);
--> statement-breakpoint
CREATE TABLE "document_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_type" text NOT NULL,
	"series" text DEFAULT '001' NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"authorization_number" text,
	"authorization_start_date" text,
	"authorization_end_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequence_organization_id_document_type_series_year_unique" UNIQUE("organization_id","document_type","series","year")
);
--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_document_id_commercial_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."commercial_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document" ADD CONSTRAINT "commercial_document_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document" ADD CONSTRAINT "commercial_document_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commercial_document_line_document_id_index" ON "commercial_document_line" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "commercial_document_organization_id_document_type_index" ON "commercial_document" USING btree ("organization_id","document_type");--> statement-breakpoint
CREATE INDEX "commercial_document_customer_id_index" ON "commercial_document" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "commercial_document_issue_date_index" ON "commercial_document" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "commercial_document_status_index" ON "commercial_document" USING btree ("status");