import type * as uomSchema from "@/db/schema/uom";

export const UOM_ITEMS: (typeof uomSchema.uom.$inferInsert)[] = [
	{
		code: "EA",
		name: "Each",
		system: "UNECE",
		category: "count",
		isPackaging: false,
	}, // unidad individual
	{
		code: "PK",
		name: "Pack",
		system: "UNECE",
		category: "count",
		isPackaging: true,
	}, // paquete
	{
		code: "CS",
		name: "Case",
		system: "UNECE",
		category: "count",
		isPackaging: true,
	}, // caja
	{
		code: "BG",
		name: "Bag",
		system: "UNECE",
		category: "count",
		isPackaging: true,
	}, // bolsa
	{
		code: "BX",
		name: "Box",
		system: "UNECE",
		category: "count",
		isPackaging: true,
	}, // caja genérica
	{
		code: "PA",
		name: "Pallet",
		system: "UNECE",
		category: "count",
		isPackaging: true,
	}, // pallet
	{
		code: "DZ",
		name: "Dozen",
		system: "UNECE",
		category: "count",
		isPackaging: false,
	}, // docena

	// === Masa ===
	{
		code: "MG",
		name: "Milligram",
		system: "UCUM",
		category: "mass",
		isPackaging: false,
	},
	{
		code: "G",
		name: "Gram",
		system: "UCUM",
		category: "mass",
		isPackaging: false,
	},
	{
		code: "KG",
		name: "Kilogram",
		system: "UCUM",
		category: "mass",
		isPackaging: false,
	},
	{
		code: "TNE",
		name: "Metric Ton",
		system: "UNECE",
		category: "mass",
		isPackaging: false,
	},

	// === Volumen ===
	{
		code: "ML",
		name: "Millilitre",
		system: "UCUM",
		category: "volume",
		isPackaging: false,
	},
	{
		code: "L",
		name: "Litre",
		system: "UCUM",
		category: "volume",
		isPackaging: false,
	},
	{
		code: "M3",
		name: "Cubic Metre",
		system: "UNECE",
		category: "volume",
		isPackaging: false,
	},

	// === Longitud ===
	{
		code: "MM",
		name: "Millimetre",
		system: "UCUM",
		category: "length",
		isPackaging: false,
	},
	{
		code: "CM",
		name: "Centimetre",
		system: "UCUM",
		category: "length",
		isPackaging: false,
	},
	{
		code: "M",
		name: "Metre",
		system: "UCUM",
		category: "length",
		isPackaging: false,
	},
	{
		code: "IN",
		name: "Inch",
		system: "UCUM",
		category: "length",
		isPackaging: false,
	},

	// === Área ===
	{
		code: "CM2",
		name: "Square Centimetre",
		system: "UCUM",
		category: "area",
		isPackaging: false,
	},
	{
		code: "M2",
		name: "Square Metre",
		system: "UCUM",
		category: "area",
		isPackaging: false,
	},

	// === Tiempo ===
	{
		code: "SEC",
		name: "Second",
		system: "UCUM",
		category: "time",
		isPackaging: false,
	},
	{
		code: "MIN",
		name: "Minute",
		system: "UCUM",
		category: "time",
		isPackaging: false,
	},
	{
		code: "HUR",
		name: "Hour",
		system: "UCUM",
		category: "time",
		isPackaging: false,
	},
	{
		code: "DAY",
		name: "Day",
		system: "UCUM",
		category: "time",
		isPackaging: false,
	},

	// === Otros ===
	{
		code: "PR",
		name: "Pair",
		system: "UNECE",
		category: "count",
		isPackaging: false,
	},
	{
		code: "SET",
		name: "Set",
		system: "UNECE",
		category: "count",
		isPackaging: false,
	},
];
export const UOM_CONVERSIONS: (typeof uomSchema.uomConversion.$inferInsert)[] =
	[
		// === Conteo (packs, cajas, pallets) ===
		{ fromUom: "PK", toUom: "EA", factor: "6" }, // 1 PK = 6 EA
		{ fromUom: "CS", toUom: "PK", factor: "6" }, // 1 CS = 6 PK
		{ fromUom: "CS", toUom: "EA", factor: "36" }, // 1 CS = 36 EA
		{ fromUom: "DZ", toUom: "EA", factor: "12" }, // 1 docena = 12 unidades
		{ fromUom: "PA", toUom: "CS", factor: "10" }, // 1 pallet = 10 cajas (ejemplo)

		// === Masa ===
		{ fromUom: "MG", toUom: "G", factor: "0.001" }, // 1 mg = 0.001 g
		{ fromUom: "G", toUom: "KG", factor: "0.001" }, // 1 g = 0.001 kg
		{ fromUom: "KG", toUom: "TNE", factor: "0.001" }, // 1 kg = 0.001 t

		// === Volumen ===
		{ fromUom: "ML", toUom: "L", factor: "0.001" }, // 1 ml = 0.001 l
		{ fromUom: "L", toUom: "M3", factor: "0.001" }, // 1 l = 0.001 m³

		// === Longitud ===
		{ fromUom: "MM", toUom: "CM", factor: "0.1" }, // 1 mm = 0.1 cm
		{ fromUom: "CM", toUom: "M", factor: "0.01" }, // 1 cm = 0.01 m
		{ fromUom: "IN", toUom: "CM", factor: "2.54" }, // 1 in = 2.54 cm
	];
