/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";
import type { FormFieldType } from "./form-field";
import type {
	Components,
	FieldKit,
	FieldTransformer,
	ParsedSchema,
	Sizes,
	SpacerType,
} from "./types";

type InternalField<C extends Components> = Omit<
	Exclude<FieldKit<any, C>, SpacerType>,
	"type"
> & {
	type: FormFieldType<C>["type"] | "hidden";
};

export function generateGrid<
	Z extends z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
>(fields: FieldKit<Z, C>[]): InternalField<C>[][] {
	const GRID_WIDTH = 12;
	const result: InternalField<C>[][] = [];
	let currentRow: InternalField<C>[] = [];
	let currentWidth = 0;

	// Helper function to create a placeholder field
	const createPlaceholder = (size: Sizes): InternalField<C> =>
		({
			name: `placeholder_${Math.random().toString(36).slice(2)}`,
			type: "hidden" as const,
			size,
			label: "",
		}) as InternalField<C>;

	for (const item of fields) {
		const field = item as Exclude<FieldKit<any, C>, SpacerType>;
		const isFillRowType = field.type === "fill";

		if (isFillRowType) {
			if (currentWidth > 0) {
				const remaining = GRID_WIDTH - currentWidth;
				currentRow.push(createPlaceholder(remaining as Sizes));
				result.push([...currentRow]);
				currentRow = [];
				currentWidth = 0;
			} else {
				result.push([createPlaceholder(12)]);
			}
			continue;
		}

		const itemWidth = field.size || 12;

		if (itemWidth < 1 || itemWidth > 12) {
			throw new Error(
				`Invalid size ${itemWidth} for field ${String(field.name) || "Unknown"}`,
			);
		}

		// If adding this item exceeds row width, start new row
		if (currentWidth + itemWidth > GRID_WIDTH) {
			if (currentRow.length > 0) {
				// Fill remaining space with placeholders
				const remaining = GRID_WIDTH - currentWidth;
				currentRow.push(createPlaceholder(remaining as Sizes));
				result.push([...currentRow]);
			}
			currentRow = [];
			currentWidth = 0;
		}

		if (!isFillRowType) {
			currentRow.push({
				...field,
				size: itemWidth,
				name: field.name,
			} as InternalField<C>);
		}
		currentWidth += itemWidth;

		// If row is exactly full, push it
		if (currentWidth === GRID_WIDTH) {
			result.push([...currentRow]);
			currentRow = [];
			currentWidth = 0;
		}
	}

	// Handle last row
	if (currentRow.length > 0) {
		const remaining = GRID_WIDTH - currentWidth;
		if (remaining > 0) {
			currentRow.push(createPlaceholder(remaining as Sizes));
		}
		result.push([...currentRow]);
	}

	// Validate that each row sums to exactly 12
	result.forEach((row, index) => {
		const rowWidth = row.reduce((sum, item) => sum + (item.size ?? 6), 0);
		if (rowWidth !== GRID_WIDTH) {
			throw new Error(`Row ${index} has invalid width: ${rowWidth}`);
		}
	});

	return result;
}
const toBaseType = (type: string) => {
	if (type === "string") return "text";
	if (type === "number") return "number";
	if (type === "boolean") return "checkbox";
	return "text";
};

export function parseFields<
	Z extends z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
>(
	schema: ParsedSchema | FieldKit<Z, C>[],
	fieldTransformer?: FieldTransformer<Z, C>,
): FieldKit<Z, C>[] {
	let defaultFields: FieldKit<Z, C>[] = schema as FieldKit<Z, C>[];

	if ("fields" in schema && schema.fields.length > 0) {
		defaultFields = schema.fields.map(
			(field) =>
				({
					name: field.key,
					size: 12,
					type: toBaseType(field.type),
					label: field.key,
				}) as unknown as FieldKit<Z, C>,
		);
	}

	if (!fieldTransformer) return defaultFields;

	const getTransformResult = (
		field: Exclude<FieldKit<Z, C>, SpacerType>,
		transformer: FieldTransformer<Z, C>,
	): FieldKit<Z, C> => {
		const { name } = field;

		// ensure some fields are not present in the original field
		const privateValues = {
			name,
		};
		if (typeof transformer === "function") {
			const transformResult = transformer(field);
			if (transformResult) {
				return {
					...field,
					...transformResult,
					...privateValues,
				} as unknown as FieldKit<Z, C>;
			}
			return field;
		}
		if (typeof transformer === "object") {
			const transformResult = transformer[name];
			if (!transformResult) return field;

			return {
				...field,
				...(typeof transformResult === "function"
					? transformResult(field)
					: transformResult),
				...privateValues,
			} as unknown as FieldKit<Z, C>;
		}

		// Si el campo no tiene transformador, devolverlo tal cual
		return field;
	};

	return defaultFields.map((field) => {
		if (field.type === "fill") return field;
		return getTransformResult(
			field as Exclude<FieldKit<Z, C>, SpacerType>,
			fieldTransformer,
		);
	});
}
