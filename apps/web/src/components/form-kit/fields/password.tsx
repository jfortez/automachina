import { Eye, EyeOff } from "lucide-react";
import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

export const PasswordField = ({ ...props }: FieldProps) => {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const field = useFieldContext<string>();
	return (
		<Fragment>
			<Input
				{...props}
				type={isPasswordVisible ? "text" : "password"}
				name={field.name}
				value={field.state.value}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
			/>
			<InputGroupAddon align="inline-end">
				<InputGroupButton
					onClick={() => setIsPasswordVisible(!isPasswordVisible)}
				>
					{isPasswordVisible ? <EyeOff /> : <Eye />}
				</InputGroupButton>
			</InputGroupAddon>
		</Fragment>
	);
};

export default PasswordField;
