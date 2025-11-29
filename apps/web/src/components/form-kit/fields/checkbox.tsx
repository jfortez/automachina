import { Checkbox } from "@/components/ui/checkbox";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

const CheckboxField = (props: FieldProps) => {
	const field = useFieldContext<boolean>();

	return (
		<div>
			<Checkbox
				id={props.id}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(!!checked)}
			/>
		</div>
	);
};

export default CheckboxField;
