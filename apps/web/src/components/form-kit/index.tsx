import { useMemo } from "react";

import type { z } from "zod";
import { Form } from "./form";
import { FormComponentsProvider } from "./form-context";
import FormField, { type FormFieldType } from "./form-field";
import { useAppForm } from "./form-hook";
import { SubmitButton, type SubmitProps } from "./subtmit";
import type {
	Components,
	FieldKit,
	FieldTransformer,
	FormSubmitHandler,
} from "./types";
import { generateGrid, parseFields } from "./util";
import { ZodProvider } from "./zod";

export type { FieldKit };

type FormProps<Z extends z.ZodObject<any>, C extends Components> = {
	schema: Z;
	initialValues?: z.input<Z>;
	fields?: FieldKit<Z, C>[];
	fieldTransformer?: FieldTransformer<Z, C>;
	onSubmit?: FormSubmitHandler<Z>;
	onCancel?: () => void;
	components?: C;
	showSubmit?: boolean;
	children?: React.ReactNode;
	buttonSettings?: Omit<SubmitProps, "handleCancel">;
};

export const FormKit = <
	Z extends z.ZodObject<any> = z.ZodObject<any>,
	C extends Components = NonNullable<unknown>,
>(
	props: FormProps<Z, C>,
) => {
	const {
		schema,
		initialValues,
		fields = [],
		onSubmit,
		onCancel,
		fieldTransformer,
		showSubmit = false,
		components = {},
		children,
		buttonSettings,
	} = props;

	const schemaProvider = useMemo(() => new ZodProvider(schema), [schema]);
	const parsedSchema = useMemo(
		() => schemaProvider.parseSchema(),
		[schemaProvider],
	);

	const defaultValues = useMemo<z.input<Z>>(() => {
		if (initialValues) return initialValues;
		return schemaProvider.getDefaultValues() as z.input<Z>;
	}, [initialValues, schemaProvider]);

	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: schema,
		},
		onSubmit: async (submitValues) => {
			await onSubmit?.(submitValues.value);
		},
	});

	const rowFields = useMemo(() => {
		const _fields = fields.length > 0 ? fields : parsedSchema;

		const parsedFields = parseFields<Z, C>(_fields, fieldTransformer);

		return generateGrid<Z, C>(parsedFields);
	}, [fields, fieldTransformer, parsedSchema]);

	const handleCancel = () => {
		onCancel?.();
	};

	return (
		<FormComponentsProvider value={{ components, schema: parsedSchema }}>
			<form.AppForm>
				<Form className="flex flex-col gap-6">
					<div className="flex flex-col gap-4">
						{rowFields.map((row, index) => (
							<div key={`row-${index + 1}`} className="grid grid-cols-12 gap-4">
								{row.map((col) => (
									<div
										key={col.name}
										className="w-full"
										style={{
											gridColumn: `span ${col.size} / span ${col.size}`,
										}}
									>
										{col.type !== "hidden" && (
											<form.AppField name={col.name}>
												{() => {
													return (
														<FormField
															metadata={col as unknown as FormFieldType<C>}
														/>
													);
												}}
											</form.AppField>
										)}
									</div>
								))}
							</div>
						))}
					</div>

					{showSubmit && (
						<SubmitButton handleCancel={handleCancel} {...buttonSettings} />
					)}
					{children}
				</Form>
			</form.AppForm>
		</FormComponentsProvider>
	);
};
export default FormKit;
