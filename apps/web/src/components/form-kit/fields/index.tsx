import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { useFormKit } from "../form-context";
import type { Components } from "../types";

import DateComponment from "./date";
import Input from "./input";
import Password from "./password";

const BaseInputComponents = {
	text: Input,
	date: DateComponment,
	password: Password,
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

export type FieldProps<
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> | FieldType = FieldType<C | undefined>,
> = FieldComponentProps<C, T>;

const Field = <
	C extends Components | undefined = undefined,
	T extends FieldType<C | undefined> = FieldType<C | undefined>,
>({
	inputType,
	showAddonIcon,
	addonIcon,
	...props
}: FieldProps<C, T> & _InternalProps<C, T>) => {
	const { components } = useFormKit();
	const Component = { ...BaseInputComponents, ...(components as C) }[inputType];

	if (!Component) return null;

	return (
		<InputGroup>
			<Component {...(props as any)} />
			{showAddonIcon && <InputGroupAddon>{addonIcon}</InputGroupAddon>}
		</InputGroup>
	);
};

export default Field;
