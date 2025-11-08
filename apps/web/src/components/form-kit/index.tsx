/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";

import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "./form";
import { FormComponentsProvider } from "./form-context";
import FormField, { type FormFieldType } from "./form-field";
import { useAppForm } from "./form-hook";
import type {
	Components,
	Field,
	FieldTransformer,
	FormSubmitHandler,
} from "./types";
import { generateFields, generateGrid } from "./util";
import { ZodProvider } from "./zod";

type FormProps<Z extends z.ZodObject<any>, C extends Components> = {
	schema: Z;
	initialValues?: z.input<Z>;
	fields?: Field<Z, C>[];
	fieldTransformer?: FieldTransformer<Z, C>;
	onSubmit?: FormSubmitHandler<Z>;
	onCancel?: () => void;
	components?: C;
	showSubmit?: boolean;
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
		showSubmit = true,
		components = {},
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
		onSubmit: async ({ value }) => {
			await onSubmit?.(value);
		},
	});

	const formFields = useMemo<Field<Z, C>[]>(() => {
		if (fields.length > 0) return fields;

		if (!parsedSchema) return [];

		return generateFields<Z, C>(parsedSchema, fieldTransformer);
	}, [fields, parsedSchema, fieldTransformer]);

	const rows = useMemo(() => generateGrid<Z, C>(formFields), [formFields]);

	const handleCancel = () => {
		form.reset();
		onCancel?.();
	};

	return (
		<FormComponentsProvider value={{ components, schema: parsedSchema }}>
			<form.AppForm>
				<Form className="flex flex-col gap-6">
					<div className="flex flex-col gap-4">
						{rows.map((row, index) => (
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
												{(field) => {
													return (
														<FormField
															metadata={col as unknown as FormFieldType<C>}
															field={field}
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
						<form.Subscribe
							selector={(state) => ({
								isSubmitting: state.isSubmitting,
								canSubmit: state.canSubmit,
							})}
						>
							{({ isSubmitting, canSubmit }) => {
								return (
									<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
										<Button
											type="button"
											variant="outline"
											onClick={handleCancel}
											disabled={isSubmitting}
										>
											Cancel
										</Button>
										<Button type="submit" disabled={!canSubmit}>
											{isSubmitting ? "Saving..." : "Save Changes"}
										</Button>
									</div>
								);
							}}
						</form.Subscribe>
					)}
				</Form>
			</form.AppForm>
		</FormComponentsProvider>
	);
};
export default FormKit;
