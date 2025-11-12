import { Link, useNavigate } from "@tanstack/react-router";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormKit } from "@/components/form-kit";
import { SubmitButton } from "@/components/form-kit/subtmit";
import { authClient } from "@/lib/auth-client";
import type { FieldKit } from "./form-kit/types";
import { Field, FieldDescription } from "./ui/field";

type LoginFormProps = {
	redirect?: string;
};

const loginSchema = z
	.object({
		email: z.email("Invalid email address").default(""),
		password: z
			.string()
			.min(3, "Password must be at least 8 characters")
			.default(""),
	})
	.required();

const fields: FieldKit<typeof loginSchema>[] = [
	{
		name: "email",
		type: "text",
		placeholder: "acme@automachina.it",
		addonIcon: <AtSign />,
		label: "Email",
	},
	{
		name: "password",
		type: "password",
		placeholder: "********",
		label: "Password",
	},
];

export function LoginForm({ redirect }: LoginFormProps) {
	const navigate = useNavigate();
	const handleSumit = async (value: z.core.input<typeof loginSchema>) => {
		await authClient.signIn.email(
			{
				email: value.email!,
				password: value.password!,
			},
			{
				onSuccess: () => {
					console.log("success");
					toast.success("Sign in successful");
					navigate({
						to: redirect,
					});
				},
				onError: (error) => {
					toast.error(error.error.message || error.error.statusText);
				},
			},
		);
	};
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col items-center gap-1 text-center">
				<h1 className="font-bold text-2xl">Login to your account</h1>
				<p className="text-balance text-muted-foreground text-sm">
					Enter your email below to login to your account
				</p>
			</div>
			<FormKit schema={loginSchema} fields={fields} onSubmit={handleSumit}>
				<div className="flex flex-col gap-4">
					<SubmitButton
						className="!flex-col"
						showCancelButton={false}
						submitText={"Login"}
					/>
					<Field>
						<FieldDescription className="text-center">
							Don&apos;t have an account?{" "}
							<Link to="/register" className="underline underline-offset-4">
								Sign up
							</Link>
						</FieldDescription>
					</Field>
				</div>
			</FormKit>
		</div>
	);
}
