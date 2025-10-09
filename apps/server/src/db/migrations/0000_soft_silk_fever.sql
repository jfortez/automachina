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
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
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
	"batch_id" uuid,
	"uom_code" text,
	"qty_in_base" numeric(28, 9) NOT NULL,
	"qty_in_uom" numeric(28, 9) NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "check_qty_in_base" CHECK ("handling_unit_content"."qty_in_base" > 0)
);
--> statement-breakpoint
CREATE TABLE "handling_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" text,
	"uom_code" text,
	"warehouse_id" uuid,
	"location_id" uuid,
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
	"organization_id" uuid NOT NULL,
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
	"organization_id" uuid NOT NULL,
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
CREATE TABLE "inventory_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sales_order_line_id" uuid,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"handling_unit_id" uuid,
	"qty_in_base" numeric(28, 9) NOT NULL,
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
	"currency" text DEFAULT 'USD'
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	"currency" text DEFAULT 'USD'
);
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"default_locale" text DEFAULT 'en-US' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "discount_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"currency" text,
	"applies_to" text NOT NULL,
	"applies_to_id" uuid,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"combinable" boolean DEFAULT false NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_type" CHECK ("discount_rule"."type" IN ('percentage','fixed','volume','bogo','tiered')),
	CONSTRAINT "check_applies_to" CHECK ("discount_rule"."applies_to" IN ('product','category','price_list','global'))
);
--> statement-breakpoint
CREATE TABLE "price_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"currency" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_organization_id_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "check_type" CHECK (("price_list"."type" IN ('public','customer','promotional','internal')))
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_organization_id_sku_unique" UNIQUE("organization_id","sku")
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "product_category_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "product_family" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
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
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"contact_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
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
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "warehouse_organization_id_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit_content" ADD CONSTRAINT "handling_unit_content_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_parent_id_handling_unit_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."handling_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handling_unit" ADD CONSTRAINT "handling_unit_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_sales_order_line_id_sales_order_line_id_fk" FOREIGN KEY ("sales_order_line_id") REFERENCES "public"."sales_order_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_handling_unit_id_handling_unit_id_fk" FOREIGN KEY ("handling_unit_id") REFERENCES "public"."handling_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_sales_order_id_sales_order_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_uom_code_uom_code_fk" FOREIGN KEY ("uom_code") REFERENCES "public"."uom"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rule" ADD CONSTRAINT "discount_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_base_uom_uom_code_fk" FOREIGN KEY ("base_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_product_family_id_product_family_id_fk" FOREIGN KEY ("product_family_id") REFERENCES "public"."product_family"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_parent_id_product_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_from_uom_uom_code_fk" FOREIGN KEY ("from_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "uom_conversion" ADD CONSTRAINT "uom_conversion_to_uom_uom_code_fk" FOREIGN KEY ("to_uom") REFERENCES "public"."uom"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "handling_unit_content_product_id_handling_unit_id_index" ON "handling_unit_content" USING btree ("product_id","handling_unit_id");--> statement-breakpoint
CREATE INDEX "cost_layer_organization_id_product_id_batch_id_index" ON "cost_layer" USING btree ("organization_id","product_id","batch_id") WHERE "cost_layer"."qty_in_base" > 0;--> statement-breakpoint
CREATE INDEX "inventory_ledger_organization_id_occurred_at_index" ON "inventory_ledger" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "discount_rule_organization_id_index" ON "discount_rule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_image_product_id_sort_order_index" ON "product_image" USING btree ("product_id","sort_order");