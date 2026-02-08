CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_document_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"product_id" uuid,
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
	"customer_id" uuid,
	"supplier_id" uuid,
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
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"contact_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "customer_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "handling_unit_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handling_unit_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" text,
	"uom_code" text,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"qty_in_uom" numeric(28, 9) NOT NULL,
	"serial_number" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "check_qty_in_base" CHECK ("handling_unit_content"."qty_in_base" > 0)
);
--> statement-breakpoint
CREATE TABLE "handling_unit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handling_unit_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid NOT NULL,
	"moved_by" text,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "handling_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"parent_id" uuid,
	"code" text,
	"type" text,
	"uom_code" text,
	"warehouse_id" uuid,
	"location_id" uuid,
	"capacity" numeric(18, 6),
	"weight_limit" numeric(18, 6),
	"weight_limit_uom" text,
	"dimensions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handling_unit_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"code" text NOT NULL,
	"mfg_date" timestamp with time zone,
	"exp_date" timestamp with time zone,
	"status" text DEFAULT 'released' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "batch_product_id_supplier_id_code_unique" UNIQUE("product_id","supplier_id","code")
);
--> statement-breakpoint
CREATE TABLE "cost_layer" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"received_at" timestamp with time zone NOT NULL,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"unit_cost" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USD',
	"source_ledger_id" bigint
);
--> statement-breakpoint
CREATE TABLE "inventory_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"movement_type" text NOT NULL,
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"location_id" uuid,
	"batch_id" uuid,
	"serial_id" uuid,
	"handling_unit_id" uuid,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"uom_code" text,
	"qty_in_uom" numeric(28, 9),
	"unit_cost" numeric(18, 6),
	"currency" text DEFAULT 'USD',
	"source_doc_type" text,
	"source_doc_id" uuid,
	"note" text,
	CONSTRAINT "check_qty_in_base" CHECK ("inventory_ledger"."qty_in_base" <> 0),
	CONSTRAINT "check_movement_type" CHECK (("inventory_ledger"."movement_type" IN ('receipt','issue','transfer_in','transfer_out','adjustment_pos','adjustment_neg','assembly_in','assembly_out','disassembly_in','disassembly_out','cycle_count','correction')))
);
--> statement-breakpoint
CREATE TABLE "serial_number" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"serial" text NOT NULL,
	"status" text DEFAULT 'in_stock' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"order_type" text NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"customer_id" uuid,
	"supplier_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(18, 2) NOT NULL,
	"total_discount" numeric(18, 2) DEFAULT '0',
	"total_tax" numeric(18, 2) DEFAULT '0',
	"total_amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"tax_region" text,
	"applied_tax_rules" jsonb DEFAULT '[]',
	"applied_discounts" jsonb DEFAULT '[]',
	"notes" text,
	"terms" text,
	"reference_number" text,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"order_line_id" uuid,
	"product_id" uuid NOT NULL,
	"description" text,
	"qty" numeric(28, 9) NOT NULL,
	"uom_code" text NOT NULL,
	"unit_price" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"line_total" numeric(18, 6) NOT NULL,
	"discount_amount" numeric(18, 6) DEFAULT '0',
	"discount_percent" numeric(6, 2),
	"tax_amount" numeric(18, 6) DEFAULT '0',
	"tax_percent" numeric(6, 2),
	"notes" text,
	"line_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"reservation_type" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"batch_id" uuid,
	"handling_unit_id" uuid,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"uom_code" text,
	"expires_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_code" text NOT NULL,
	"qty_ordered" numeric(28, 9) NOT NULL,
	"price_per_uom" numeric(18, 6),
	"currency" text DEFAULT 'USD',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"code" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"notes" text,
	"reference_number" text,
	"fulfilled_at" timestamp with time zone,
	"invoice_id" uuid,
	CONSTRAINT "purchase_order_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "sales_order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_code" text NOT NULL,
	"qty_ordered" numeric(28, 9) NOT NULL,
	"price_per_uom" numeric(18, 6),
	"currency" text DEFAULT 'USD',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"code" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"notes" text,
	"reference_number" text,
	"invoice_id" uuid,
	CONSTRAINT "sales_order_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"business_name" text,
	"tax_id" text,
	"legal_entity_type" text,
	"is_required_to_keep_books" boolean DEFAULT false,
	"main_address" jsonb,
	"branch_address" jsonb,
	"logo_url" text,
	"favicon_url" text,
	"site_title" text,
	"site_subtitle" text,
	"website" text,
	"contact_email" text,
	"language" text DEFAULT 'es' NOT NULL,
	"timezone" text DEFAULT 'America/Guayaquil' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"decimal_precision" integer DEFAULT 2 NOT NULL,
	"quantity_precision" integer DEFAULT 3 NOT NULL,
	"tax_region" text DEFAULT 'GENERAL' NOT NULL,
	"default_tax_percent" numeric(6, 2) DEFAULT '0',
	"tax_included_in_price" boolean DEFAULT false,
	"fiscal_provider" text DEFAULT 'none' NOT NULL,
	"fiscal_provider_config" jsonb DEFAULT '{}'::jsonb,
	"invoice_sequence_prefix" text DEFAULT 'FAC',
	"auto_generate_invoices" boolean DEFAULT true,
	"default_payment_terms" text DEFAULT 'net_30',
	"auto_apply_discounts" boolean DEFAULT true,
	"require_approval_for_discounts" boolean DEFAULT false,
	"max_discount_percent" numeric(6, 2) DEFAULT '0',
	"require_approval_for_orders" boolean DEFAULT false,
	"order_approval_threshold" numeric(18, 2),
	"max_cash_discrepancy" numeric(18, 2) DEFAULT '10',
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "discount_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"applies_to" text NOT NULL,
	"applies_to_id" uuid,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"combinable" boolean DEFAULT false NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"currency" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"base_uom" text NOT NULL,
	"tracking_level" text NOT NULL,
	"perishable" boolean DEFAULT false NOT NULL,
	"shelf_life_days" integer,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"product_family_id" uuid,
	"parent_id" uuid,
	"suggested_retail_price" numeric(28, 9),
	"default_cost" numeric(28, 9),
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"is_physical" boolean DEFAULT true NOT NULL,
	"weight" numeric(18, 6),
	"weight_uom" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_organization_id_sku_unique" UNIQUE("organization_id","sku")
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "product_category_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "product_family" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"variation_theme" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_family_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "product_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"uom_code" text,
	CONSTRAINT "product_identifier_type_value_unique" UNIQUE("type","value")
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_family_id" uuid,
	"url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"mime" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_image_product_id_url_unique" UNIQUE("product_id","url")
);
--> statement-breakpoint
CREATE TABLE "product_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"price_list_id" uuid,
	"customer_id" uuid,
	"uom_code" text NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"min_qty" numeric(28, 9) DEFAULT '1' NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_price_product_id_price_list_id_customer_id_uom_code_unique" UNIQUE("product_id","price_list_id","customer_id","uom_code"),
	CONSTRAINT "check_price" CHECK (("product_price"."price" >= 0) )
);
--> statement-breakpoint
CREATE TABLE "product_uom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_code" text NOT NULL,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_uom_product_id_uom_code_unique" UNIQUE("product_id","uom_code")
);
--> statement-breakpoint
CREATE TABLE "supplier_product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_sku" text,
	"default_uom" text,
	"lead_time_days" integer,
	"min_order_qty" numeric(28, 9),
	CONSTRAINT "supplier_product_supplier_id_product_id_unique" UNIQUE("supplier_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"contact_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "invoice_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"sequence_type" text DEFAULT 'sales',
	"last_number" integer DEFAULT 0 NOT NULL,
	"prefix" text,
	"reset_type" text DEFAULT 'year',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"region" text DEFAULT 'GENERAL',
	"tax_type" text NOT NULL,
	"tax_percent" numeric(6, 2) DEFAULT '0',
	"fixed_amount" numeric(18, 2),
	"applies_to_products" jsonb DEFAULT '[]',
	"applies_to_categories" jsonb DEFAULT '[]',
	"min_amount" numeric(18, 2),
	"max_amount" numeric(18, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uom" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"system" text NOT NULL,
	"category" text NOT NULL,
	"is_packaging" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_system" CHECK ("uom"."system" in ('UNECE','UCUM'))
);
--> statement-breakpoint
CREATE TABLE "uom_conversion" (
	"from_uom" text NOT NULL,
	"to_uom" text NOT NULL,
	"factor" numeric(28, 12) NOT NULL,
	CONSTRAINT "uom_conversion_from_uom_to_uom_pk" PRIMARY KEY("from_uom","to_uom"),
	CONSTRAINT "check_uom_conversion" CHECK ("uom_conversion"."from_uom" <> "uom_conversion"."to_uom")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"temperature_c_min" numeric(10, 2),
	"temperature_c_max" numeric(10, 2),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "location_warehouse_id_code_unique" UNIQUE("warehouse_id","code")
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "warehouse_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_document_id_commercial_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."commercial_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document_line" ADD CONSTRAINT "commercial_document_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document" ADD CONSTRAINT "commercial_document_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_document" ADD CONSTRAINT "commercial_document_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_history" ADD CONSTRAINT "handling_unit_history_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_history" ADD CONSTRAINT "handling_unit_history_from_location_id_location_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_history" ADD CONSTRAINT "handling_unit_history_to_location_id_location_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_parent_id_handling_unit_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."handling_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_weight_limit_uom_uom_code_fk" FOREIGN KEY ("weight_limit_uom") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_layer" ADD CONSTRAINT "cost_layer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_layer" ADD CONSTRAINT "cost_layer_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_layer" ADD CONSTRAINT "cost_layer_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_layer" ADD CONSTRAINT "cost_layer_source_ledger_id_inventory_ledger_id_fk" FOREIGN KEY ("source_ledger_id") REFERENCES "public"."inventory_ledger"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_serial_id_serial_number_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."serial_number"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_number" ADD CONSTRAINT "serial_number_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_number" ADD CONSTRAINT "serial_number_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_sales_order_id_sales_order_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rule" ADD CONSTRAINT "discount_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_base_uom_uom_code_fk" FOREIGN KEY ("base_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_product_family_id_product_family_id_fk" FOREIGN KEY ("product_family_id") REFERENCES "public"."product_family"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_parent_id_product_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_weight_uom_uom_code_fk" FOREIGN KEY ("weight_uom") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_family" ADD CONSTRAINT "product_family_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_identifier" ADD CONSTRAINT "product_identifier_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_identifier" ADD CONSTRAINT "product_identifier_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_family_id_product_family_id_fk" FOREIGN KEY ("product_family_id") REFERENCES "public"."product_family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_price_list_id_price_list_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_list"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product" ADD CONSTRAINT "supplier_product_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product" ADD CONSTRAINT "supplier_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product" ADD CONSTRAINT "supplier_product_default_uom_uom_code_fk" FOREIGN KEY ("default_uom") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule" ADD CONSTRAINT "tax_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_from_uom_uom_code_fk" FOREIGN KEY ("from_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_to_uom_uom_code_fk" FOREIGN KEY ("to_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "commercial_document_line_document_id_index" ON "commercial_document_line" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "commercial_document_organization_id_document_type_index" ON "commercial_document" USING btree ("organization_id","document_type");--> statement-breakpoint
CREATE INDEX "commercial_document_customer_id_index" ON "commercial_document" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "commercial_document_issue_date_index" ON "commercial_document" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "commercial_document_status_index" ON "commercial_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "handling_unit_content_product_id_handling_unit_id_index" ON "handling_unit_content" USING btree ("product_id","handling_unit_id");--> statement-breakpoint
CREATE INDEX "handling_unit_history_handling_unit_id_moved_at_index" ON "handling_unit_history" USING btree ("handling_unit_id","moved_at");--> statement-breakpoint
CREATE INDEX "cost_layer_organization_id_product_id_batch_id_index" ON "cost_layer" USING btree ("organization_id","product_id","batch_id") WHERE "cost_layer"."qty_in_base" > 0;--> statement-breakpoint
CREATE INDEX "inventory_ledger_organization_id_occurred_at_index" ON "inventory_ledger" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "inventory_reservation_organization_id_product_id_index" ON "inventory_reservation" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_reservation_reference_type_reference_id_index" ON "inventory_reservation" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "inventory_reservation_expires_at_index" ON "inventory_reservation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "discount_rule_organization_id_index" ON "discount_rule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_image_product_id_sort_order_index" ON "product_image" USING btree ("product_id","sort_order");