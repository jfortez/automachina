import BaseInputComponents from "./fields";
import { useFormKit } from "./form-context";
import type { Components } from "./types";

export type FieldType<C extends Components> =
	keyof (typeof BaseInputComponents & C);

export type FieldComponentProps<
	C extends Components,
	T extends FieldType<C>,
> = React.ComponentProps<(typeof BaseInputComponents & C)[T]>;

export type FieldProps<
	C extends Components,
	T extends FieldType<C>,
> = FieldComponentProps<C, T>;

const Field = <C extends Components, T extends FieldType<C>>({
	inputType,
	...props
}: FieldProps<C, T> & { inputType: T }) => {
	const { components } = useFormKit();
	const Component = { ...BaseInputComponents, ...(components as C) }[inputType];

	if (!Component) return null;

	return <Component {...props} />;
};

export default Field;
