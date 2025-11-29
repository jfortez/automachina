import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { useFormKit } from "../form-context";
import type { Components } from "../types";

import Checkbox from "./checkbox";
import DateComponment from "./date";
import Input from "./input";
import NumberField from "./number";
import Password from "./password";
import Select from "./select";
import Textarea from "./textarea";

const BaseInputComponents = {
	text: Input,
	number: NumberField,
	date: DateComponment,
	password: Password,
	textarea: Textarea,
	select: Select,
	checkbox: Checkbox,
};

export type BaseFieldType = keyof typeof BaseInputComponents;

export type FieldType<C extends Components | undefined = NonNullable<unknown>> =
	| BaseFieldType
	| keyof C;

type _InternalProps<
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> = FieldType<C | undefined>,
> = {
	inputType: T;
	showAddonIcon?: boolean;
	addonIcon?: React.ReactNode;
};

export type FieldComponentProps<
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> | FieldType = FieldType<C | undefined>,
> = C extends Components
	? React.ComponentProps<(typeof BaseInputComponents & C)[T]>
	: React.ComponentProps<(typeof BaseInputComponents)[T & BaseFieldType]>;

export type BaseFieldProps<
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> | FieldType = FieldType<C | undefined>,
> = FieldComponentProps<C, T>;

const EXCLUDED_FIELD_TYPES_FROM_INPUT_GROUP: FieldType[] = ["checkbox"];

const Field = <
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> = FieldType<C | undefined>,
>({
	inputType,
	showAddonIcon,
	addonIcon,
	...props
}: BaseFieldProps<C, T> & _InternalProps<C, T>) => {
	const { components } = useFormKit();
	const Component = { ...BaseInputComponents, ...(components as C) }[inputType];

	if (!Component) return null;

	const isValidInputGroupType =
		EXCLUDED_FIELD_TYPES_FROM_INPUT_GROUP.indexOf(inputType) === -1;

	if (!isValidInputGroupType) return <Component {...props} />;

	return (
		<InputGroup>
			<Component {...props} />
			{showAddonIcon && addonIcon && (
				<InputGroupAddon
					align={inputType === "textarea" ? "block-end" : "inline-start"}
				>
					{addonIcon}
				</InputGroupAddon>
			)}
		</InputGroup>
	);
};

export default Field;
