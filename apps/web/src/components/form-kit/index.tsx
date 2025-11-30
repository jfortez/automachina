/** biome-ignore-all lint/suspicious/noExplicitAny: its ok */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: nah id win> */

import { Plus, Trash } from "lucide-react";
import { memo, useMemo } from "react";
import type { z } from "zod";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Form, useFieldContext, useFormContext } from "./form";
import { FormComponentsProvider } from "./form-context";
import FormField from "./form-field";
import { useAppForm } from "./form-hook";
import { SubmitButton, type SubmitProps } from "./subtmit";
import type {
	Components,
	FieldKit,
	FieldTransformer,
	FormSubmitHandler,
} from "./types";
import { generateGrid, type InternalField, parseFields } from "./util";
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

type RenderGridProps<Z extends z.ZodObject<any>> = {
	parsedFields: InternalField<Z>[];
};

const getDefaultsByType = (type: string) => {
	const map = {
		text: "",
		number: 0,
		checkbox: false,
		select: "",
		textarea: "",
		date: "",
		password: "",
	};
	return map[type as keyof typeof map];
};

type ArrayItemProps = {
	label?: string;
	defaultValues?: Record<string, unknown>;
};

const getDefaultValues = (parsedFields: InternalField<any>[]) => {
	return parsedFields.reduce(
		(acc, field) => {
			acc[field.name] = getDefaultsByType(field.type);
			return acc;
		},
		{} as Record<string, unknown>,
	);
};
const ArrayItemControl = ({ defaultValues, label }: ArrayItemProps) => {
	const field = useFieldContext();

	const handleAddItem = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		e.preventDefault();
		field.pushValue(defaultValues as never);
	};
	return (
		<div className="flex items-center justify-between">
			<Label>{label}</Label>
			<div className="flex items-center justify-end">
				<Button onClick={handleAddItem} size={label ? "sm" : "icon"}>
					<Plus />
					{label && `Add ${label}`}
				</Button>
			</div>
		</div>
	);
};

type RenderFieldProps = {
	col: InternalField;
	mode: "value" | "array";
};

const RenderField = ({ col, mode }: RenderFieldProps) => {
	const form = useFormContext() as unknown as ReturnType<typeof useAppForm>;
	if (mode === "array") {
		const schema = col.schema[0].schema!;
		const nextParsedFields = parseFields([], schema);
		if (nextParsedFields.length === 0) return null;
		const defaultValues = getDefaultValues(nextParsedFields);

		return (
			<div className="group/item-group">
				<Collapsible defaultOpen>
					<form.AppField name={col.name} mode="array">
						{(field) => {
							const items = (field.state.value as unknown[]) || [];

							return (
								<div className="flex flex-col gap-2">
									<CollapsibleTrigger className="bg-background">
										<ArrayItemControl
											label={col.label}
											defaultValues={defaultValues}
										/>
									</CollapsibleTrigger>

									<CollapsibleContent className="rounded-md p-3 group-hover/item-group:bg-accent/10">
										{items.length === 0 ? (
											<div className="flex h-20 items-center justify-center">
												<div>
													<h3 className="text-center font-medium text-lg">
														No items
													</h3>
													<span className="text-muted-foreground text-sm">
														Add an item to get started
													</span>
												</div>
											</div>
										) : (
											<div className="flex flex-col gap-3">
												{items.map((_, idx) => {
													const parsedFields = nextParsedFields.map((item) => ({
														...item,
														name: `${col.name}[${idx}].${item.name}`,
													}));

													const handleRemoveItem = () => {
														field.removeValue(idx);
													};
													return (
														<div
															className="group relative rounded-md border p-4"
															key={idx}
														>
															<Button
																type="button"
																className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100"
																variant="destructive"
																size="icon"
																onClick={handleRemoveItem}
															>
																<Trash className="size-3" />
															</Button>
															<RenderGrid parsedFields={parsedFields} />
														</div>
													);
												})}
											</div>
										)}
									</CollapsibleContent>
								</div>
							);
						}}
					</form.AppField>
				</Collapsible>
			</div>
		);
	}
	return (
		<form.AppField name={col.name}>
			{() => {
				return <FormField metadata={col as unknown as any} />;
			}}
		</form.AppField>
	);
};

const RenderGrid = memo(
	<Z extends z.ZodObject<any>>({ parsedFields }: RenderGridProps<Z>) => {
		const rowFields = useMemo(() => {
			return generateGrid<Z>(parsedFields);
		}, [parsedFields]);

		return (
			<div className="flex flex-col gap-4">
				<div className={cn("flex flex-col gap-4")}>
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
										<RenderField col={col} mode={col.mode} />
									)}
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		);
	},
);

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
	const parsedFields = useMemo(() => {
		const parsedFields = schemaProvider.parseSchema();

		return parseFields<Z, C>(fields, parsedFields.fields, fieldTransformer);
	}, [schemaProvider, fields, fieldTransformer]);

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
			await onSubmit?.(submitValues.value as z.input<any>);
		},
	});

	const handleCancel = () => {
		onCancel?.();
	};

	return (
		<FormComponentsProvider value={{ components, schema: parsedFields }}>
			<form.AppForm>
				<Form className="flex flex-col gap-6">
					<RenderGrid parsedFields={parsedFields} />
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
