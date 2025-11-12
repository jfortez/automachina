import { Input } from "@/components/ui/input";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

type InputProps = {
	fooBar: string;
};

export const InputField = ({ fooBar, ...props }: FieldProps<InputProps>) => {
	const field = useFieldContext<string>();
	return (
		<Input
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(e) => field.handleChange(e.target.value)}
			onBlur={field.handleBlur}
		/>
	);
};

export default InputField;
