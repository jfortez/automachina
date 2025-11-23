import {
	CalendarIcon,
	CaseSensitiveIcon,
	Combine,
	Lock,
	Type,
} from "lucide-react";
import type React from "react";
import Field, {
	type BaseFieldProps,
	type BaseFieldType,
	type FieldType,
} from "./fields";
import type { FieldAttributes } from "./fields/type";
import {
	FieldControl,
	FieldDescription,
	FieldError,
	FieldLabel,
	Field as FieldPrimitive,
} from "./form";
import type { Components } from "./types";

const defaultAddonIcons: Partial<Record<BaseFieldType, React.ReactNode>> = {
	text: <Type />,
	date: <CalendarIcon />,
	password: <Lock />,
	textarea: <CaseSensitiveIcon />,
	select: <Combine />,
};

type BaseField = {
	name: string;
	label?: string;
	placeholder?: string;
	description?: string;
	element?: React.ReactNode;
	addonIcon?: React.ReactNode;
	showAddonIcon?: boolean;
};

type FormFieldMap<C extends Components | undefined = undefined> = {
	[K in FieldType<C>]: BaseField & {
		type: K;
		fieldProps?: Omit<BaseFieldProps<C, K & FieldType>, keyof FieldAttributes>;
	};
};

export type FormFieldType<
	C extends Components | undefined = NonNullable<unknown>,
> = FormFieldMap<C>[FieldType<C>];

type FormInputProps<C extends Components | undefined = NonNullable<unknown>> = {
	metadata: FormFieldType<C>;
};

const FormField = <C extends Components | undefined = undefined>({
	metadata,
}: FormInputProps<C>) => {
	const { addonIcon: _addonIcon, showAddonIcon = true } = metadata;
	const addonIcon = _addonIcon || defaultAddonIcons[metadata.type];
	return (
		<FieldPrimitive>
			{metadata.label && <FieldLabel>{metadata.label}</FieldLabel>}
			<FieldControl>
				{metadata.element ? (
					metadata.element
				) : (
					<Field
						inputType={metadata.type as unknown as any}
						showAddonIcon={showAddonIcon}
						addonIcon={addonIcon}
						{...metadata.fieldProps}
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
