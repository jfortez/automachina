-- Recomendado: Postgres 14+.
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

-- ==========
-- UTILIDADES
-- ==========
-- Dominio para cantidades con alta precisión (soporta masa/volumen/líquidos).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qty') THEN
    CREATE DOMAIN qty AS numeric(28,9)
      CHECK (VALUE IS NULL OR VALUE >= 0);
  END IF;
END$$;

-- ==========
-- MULTI TENANT
-- ==========
CREATE TABLE IF NOT EXISTS organization (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  name            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ==========
-- UoM Y CONVERSIONES
-- ==========
CREATE TABLE IF NOT EXISTS uom (
  code            text PRIMARY KEY,       -- p.ej. 'EA', 'KG', 'L', 'CS', 'PK', 'mL', 'g'
  name            text NOT NULL,
  system          text NOT NULL CHECK (system IN ('UNECE','UCUM')), -- estándares
  category        text NOT NULL,          -- 'count','mass','volume','length','area','time','other'
  is_packaging    boolean NOT NULL DEFAULT false, -- útil para códigos tipo 'CS' (case), 'PK' (pack)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uom_conversion (
  -- Conversión multiplicativa: 1 from_uom = factor * to_uom (dentro de la misma categoría).
  from_uom        text REFERENCES uom(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  to_uom          text REFERENCES uom(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  factor          numeric(28,12) NOT NULL CHECK (factor > 0),
  PRIMARY KEY (from_uom, to_uom),
  CHECK (from_uom <> to_uom)
);

-- ==========
-- CATALOGACIÓN DE PRODUCTOS
-- ==========
CREATE TABLE IF NOT EXISTS product_category (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS product (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  sku             text NOT NULL,                       -- código interno
  name            text NOT NULL,
  description     text,
  category_id     uuid REFERENCES product_category(id),
  base_uom        text NOT NULL REFERENCES uom(code),  -- UoM base (p.ej. 'EA' o 'g' o 'mL')
  tracking_level  text NOT NULL CHECK (tracking_level IN ('none','lot','serial','lot+serial')),
  perishable      boolean NOT NULL DEFAULT false,
  shelf_life_days integer,                             -- opcional para FEFO
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- campos flexibles (CAS, NDC, octanaje, etc.)
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku)
);

-- Identificadores externos (GTIN, EAN, UPC, NDC, CAS, SKU de proveedor, etc.)
CREATE TABLE IF NOT EXISTS product_identifier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  type            text NOT NULL, -- 'GTIN','EAN','UPC','NDC','CAS','SKU_SUPPLIER','CUSTOM', etc.
  value           text NOT NULL,
  uom_code        text REFERENCES uom(code), -- opcional: GTIN específico por nivel de empaque
  UNIQUE (type, value)
);

-- Presentaciones / empaques válidos por producto (conversión a base)
CREATE TABLE IF NOT EXISTS product_uom (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  uom_code        text NOT NULL REFERENCES uom(code),
  qty_in_base     qty  NOT NULL CHECK (qty_in_base > 0),  -- p.ej. PACK de 6 -> 6 * 'EA'
  is_base         boolean NOT NULL DEFAULT false,         -- exactamente 1 por producto debe ser base
  UNIQUE (product_id, uom_code)
);
-- Garantiza 1 sola UoM base por producto
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_uom_base
ON product_uom(product_id) WHERE (is_base);

-- ==========
-- PROVEEDORES Y COMPRAS
-- ==========
CREATE TABLE IF NOT EXISTS supplier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  contact_info    jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, code)
);

-- Catálogo de productos del proveedor (para facilitar alta/ingreso)
CREATE TABLE IF NOT EXISTS supplier_product (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     uuid NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  supplier_sku    text,
  default_uom     text REFERENCES uom(code),
  lead_time_days  integer,
  min_order_qty   qty,
  UNIQUE (supplier_id, product_id)
);

-- ==========
-- ALMACENES Y UBICACIONES
-- ==========
CREATE TABLE IF NOT EXISTS warehouse (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  address         jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS location (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id    uuid NOT NULL REFERENCES warehouse(id) ON DELETE CASCADE,
  code            text NOT NULL,       -- bin/estante/pasillo
  type            text NOT NULL CHECK (type IN ('storage','staging_in','staging_out','qc_hold','damaged','returns')),
  temperature_c_min numeric(10,2),     -- opcional: control de temperatura
  temperature_c_max numeric(10,2),
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (warehouse_id, code)
);

-- ==========
-- LOTES Y SERIES
-- ==========
CREATE TABLE IF NOT EXISTS batch (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  code            text NOT NULL,                -- Nº de lote (puede venir del proveedor)
  supplier_id     uuid REFERENCES supplier(id),
  mfg_date        date,
  exp_date        date,
  status          text NOT NULL DEFAULT 'released' CHECK (status IN ('released','quarantine','recalled','expired')),
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, code)
);

CREATE TABLE IF NOT EXISTS serial_number (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  batch_id        uuid REFERENCES batch(id) ON DELETE SET NULL,
  serial          text NOT NULL,
  status          text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','shipped','scrapped','lost')),
  UNIQUE (product_id, serial)
);

-- ==========
-- HANDLING UNITS (HU) Y CONTENIDO
-- ==========
CREATE TABLE IF NOT EXISTS handling_unit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES handling_unit(id) ON DELETE CASCADE, -- jerarquía (pallet->caja->pack)
  code            text,     -- SSCC o etiqueta interna
  uom_code        text REFERENCES uom(code), -- tipo de empaque representado por la HU (CS, PK, etc.)
  warehouse_id    uuid REFERENCES warehouse(id) ON DELETE SET NULL,
  location_id     uuid REFERENCES location(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

-- HU con contenido multi-producto (permite cajas mixtas)
CREATE TABLE IF NOT EXISTS handling_unit_content (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handling_unit_id uuid NOT NULL REFERENCES handling_unit(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  batch_id        uuid REFERENCES batch(id) ON DELETE SET NULL,
  qty_in_base     qty NOT NULL,   -- SIEMPRE en UoM base del producto
  CHECK (qty_in_base >= 0)
);

-- ==========
-- DOCUMENTOS (simplificados)
-- ==========
CREATE TABLE IF NOT EXISTS purchase_order (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
  code            text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_received','closed','cancelled')),
  ordered_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS purchase_order_line (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  uom_code        text NOT NULL REFERENCES uom(code),
  qty_ordered     qty NOT NULL CHECK (qty_ordered > 0),
  price_per_uom   numeric(18,6),
  currency        text DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS goods_receipt (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_order(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES warehouse(id) ON DELETE RESTRICT,
  received_at     timestamptz NOT NULL DEFAULT now(),
  code            text,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS goods_receipt_line (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL REFERENCES goods_receipt(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES purchase_order_line(id) ON DELETE SET NULL,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  uom_code        text NOT NULL REFERENCES uom(code),
  qty_received    qty NOT NULL CHECK (qty_received > 0),
  batch_id        uuid REFERENCES batch(id),
  created_hu_id   uuid REFERENCES handling_unit(id), -- si se creó una caja/pack al recibir
  cost_per_uom    numeric(18,6),
  currency        text DEFAULT 'USD'
);

-- ==========
-- RESERVAS Y ÓRDENES DE SALIDA (simplificado)
-- ==========
CREATE TABLE IF NOT EXISTS customer (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  contact_info    jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS sales_order (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  code            text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','allocated','shipped','closed','cancelled')),
  ordered_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS sales_order_line (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  uuid NOT NULL REFERENCES sales_order(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  uom_code        text NOT NULL REFERENCES uom(code),
  qty_ordered     qty NOT NULL CHECK (qty_ordered > 0),
  price_per_uom   numeric(18,6),
  currency        text DEFAULT 'USD'
);

-- Reservas por lote/HU (para asignación FEFO o exacta)
CREATE TABLE IF NOT EXISTS inventory_reservation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  sales_order_line_id uuid REFERENCES sales_order_line(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id),
  batch_id        uuid REFERENCES batch(id),
  handling_unit_id uuid REFERENCES handling_unit(id),
  qty_in_base     qty NOT NULL CHECK (qty_in_base > 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ==========
-- LEDGER DE INVENTARIO (EVENT-SOURCING)
-- ==========
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id              bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  movement_type   text NOT NULL CHECK (movement_type IN (
                      'receipt','issue','transfer_in','transfer_out',
                      'adjustment_pos','adjustment_neg',
                      'assembly_in','assembly_out','disassembly_in','disassembly_out',
                      'cycle_count','correction'
                    )),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  warehouse_id    uuid REFERENCES warehouse(id),
  location_id     uuid REFERENCES location(id),
  batch_id        uuid REFERENCES batch(id),
  serial_id       uuid REFERENCES serial_number(id),
  handling_unit_id uuid REFERENCES handling_unit(id),
  -- Cantidad en UoM base del producto; positiva = entra, negativa = sale
  qty_in_base     numeric(28,9) NOT NULL CHECK (qty_in_base <> 0),
  -- Captura la UoM original del documento (para auditoría)
  uom_code        text REFERENCES uom(code),
  qty_in_uom      numeric(28,9),
  -- Costo y moneda (para COGS/capas FIFO)
  unit_cost       numeric(18,6),
  currency        text DEFAULT 'USD',
  -- Referencias documentales
  source_doc_type text,  -- 'GRN','SO','ADJ','XFER', etc.
  source_doc_id   uuid,
  note            text
);
CREATE INDEX IF NOT EXISTS ix_inv_ledger_org_time ON inventory_ledger(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_inv_ledger_prod ON inventory_ledger(product_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_inv_ledger_lot ON inventory_ledger(batch_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_inv_ledger_loc ON inventory_ledger(warehouse_id, location_id);

-- ==========
-- CAPAS DE COSTO (para FIFO/MAV)
-- ==========
CREATE TABLE IF NOT EXISTS cost_layer (
  id              bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  batch_id        uuid REFERENCES batch(id),
  received_at     timestamptz NOT NULL,
  qty_in_base     numeric(28,9) NOT NULL CHECK (qty_in_base >= 0), -- pendiente por consumir
  unit_cost       numeric(18,6) NOT NULL,
  currency        text DEFAULT 'USD',
  source_ledger_id bigint REFERENCES inventory_ledger(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_cost_layer_open ON cost_layer(organization_id, product_id) WHERE qty_in_base > 0;

-- ==========
-- VISTAS DE SALDOS
-- ==========
-- Saldos por producto/almacén/ubicación/lote
CREATE OR REPLACE VIEW inventory_balances_v AS
SELECT
  il.organization_id,
  il.product_id,
  il.warehouse_id,
  il.location_id,
  il.batch_id,
  SUM(il.qty_in_base) AS on_hand_base
FROM inventory_ledger il
GROUP BY il.organization_id, il.product_id, il.warehouse_id, il.location_id, il.batch_id;

-- Helper: convertir saldos a una UoM deseada si existe en product_uom
CREATE OR REPLACE VIEW inventory_balances_converted_v AS
SELECT
  ib.organization_id,
  ib.product_id,
  p.base_uom,
  pu.uom_code AS display_uom,
  ib.warehouse_id,
  ib.location_id,
  ib.batch_id,
  ib.on_hand_base,
  CASE WHEN pu.qty_in_base > 0 THEN ib.on_hand_base / pu.qty_in_base ELSE NULL END AS on_hand_in_display_uom
FROM inventory_balances_v ib
JOIN product p ON p.id = ib.product_id
LEFT JOIN LATERAL (
  SELECT uom_code, qty_in_base
  FROM product_uom pu
  WHERE pu.product_id = ib.product_id
  ORDER BY (CASE WHEN is_base THEN 1 ELSE 2 END), qty_in_base
  LIMIT 1
) pu ON TRUE;

-- Vista FEFO: próximos a caducar
CREATE OR REPLACE VIEW fefo_candidates_v AS
SELECT
  ib.organization_id, ib.product_id, ib.warehouse_id, ib.location_id,
  b.id AS batch_id, b.exp_date, ib.on_hand_base
FROM inventory_balances_v ib
JOIN batch b ON b.id = ib.batch_id
WHERE b.exp_date IS NOT NULL AND ib.on_hand_base > 0
ORDER BY b.exp_date ASC;
