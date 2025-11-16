/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";
import type { FormFieldType } from "./form-field";

export type Components = Record<string, React.ComponentType<any>>;

export type Sizes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type SpacerType = {
	type: "fill";
	size?: Sizes;
};

export type FieldKit<
	ZObject extends z.ZodObject<any> = z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
> =
	| (FormFieldType<C> & {
			name: keyof z.infer<ZObject>;
			size?: Sizes;
	  })
	| SpacerType;

type MaybePromise<T> = T | Promise<T>;

export type FormSubmitHandler<Z extends z.ZodObject<any>> = (
	values: z.core.input<Z>,
) => MaybePromise<void>;

//TODO: Omit "name" using Omit<T, "name"> causes a non controlable type error in `fieldProps`
type _TransformField<C extends Components = NonNullable<unknown>> =
	FormFieldType<C> & {
		size?: Sizes;
		name: "foo";
	};

type FieldTransformFunction<
	Z extends z.ZodObject<any>,
	C extends Components,
> = (
	field: Exclude<FieldKit<Z, C>, SpacerType>,
) => Partial<_TransformField<C>> | undefined;

type FieldTransformObject<
	Z extends z.ZodObject<any> = z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
> = Partial<{
	[K in keyof z.infer<Z>]:
		| Partial<_TransformField<C>>
		| FieldTransformFunction<Z, C>;
}>;

export type FieldTransformer<
	Z extends z.ZodObject<any> = z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
> = FieldTransformObject<Z, C> | FieldTransformFunction<Z, C>;

export type Option = {
	id: string | number;
	name: string;
};

export type SelectOptions = Option[] | Promise<Option[]>;

export type Renderable<AdditionalRenderable = null> =
	| string
	| number
	| boolean
	| null
	| undefined
	| AdditionalRenderable;

export interface FieldConfig<
	AdditionalRenderable = null,
	FieldTypes = string,
	FieldWrapper = any,
	CustomData = Record<string, any>,
> {
	description?: Renderable<AdditionalRenderable>;
	inputProps?: Record<string, any>;
	label?: Renderable<AdditionalRenderable>;
	fieldType?: FieldTypes;
	order?: number;
	fieldWrapper?: FieldWrapper;
	customData?: CustomData;
}

export interface ParsedField<AdditionalRenderable = null, FieldTypes = string> {
	key: string;
	type: string;
	required: boolean;
	default?: any;
	description?: Renderable;
	fieldConfig?: FieldConfig<AdditionalRenderable, FieldTypes>;

	// Field-specific
	options?: [string, string][]; // [value, label] for enums
	schema?: ParsedField<AdditionalRenderable, FieldTypes>[]; // For objects and arrays
}

export interface ParsedSchema<
	AdditionalRenderable = null,
	FieldTypes = string,
> {
	fields: ParsedField<AdditionalRenderable, FieldTypes>[];
}

export type SuccessfulSchemaValidation = {
	success: true;
	data: any;
};
export type SchemaValidationError = {
	path: (string | number)[];
	message: string;
};
export type ErrorSchemaValidation = {
	success: false;
	errors: SchemaValidationError[];
};
export type SchemaValidation =
	| SuccessfulSchemaValidation
	| ErrorSchemaValidation;
