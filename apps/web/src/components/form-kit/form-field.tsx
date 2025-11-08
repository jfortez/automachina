import Field, { type FieldProps, type FieldType } from "./field";
import {
	FieldControl,
	FieldDescription,
	FieldError,
	FieldLabel,
	Field as FieldPrimitive,
} from "./form";
import type { Components } from "./types";

type BaseField = {
	name: string;
	label?: string;
	placeholder?: string;
	description?: string;
	element?: React.ReactNode;
};

type FormFieldMap<C extends Components> = {
	[K in FieldType<C>]: BaseField & {
		type: K;
		fieldProps?: FieldProps<C, K>;
	};
};

export type FormFieldType<C extends Components = NonNullable<unknown>> =
	FormFieldMap<C>[FieldType<C>];

type FormInputProps<C extends Components> = {
	metadata: FormFieldType<C>;
	field: any;
};
const FormField = <C extends Components>({
	metadata,
	field,
}: FormInputProps<C>) => {
	return (
		<FieldPrimitive>
			{metadata.label && <FieldLabel>{metadata.label}</FieldLabel>}
			<FieldControl>
				{metadata.element ? (
					metadata.element
				) : (
					<Field
						inputType={metadata.type}
						placeholder={metadata.placeholder}
						value={field.state.value}
						onChange={(e) => field.handleChange(e.target.value)}
						onBlur={field.handleBlur}
					/>
				)}
			</FieldControl>
			{metadata.description && (
				<FieldDescription>{metadata.description}</FieldDescription>
			)}
			<FieldError />
		</FieldPrimitive>
	);
};

export default FormField;
