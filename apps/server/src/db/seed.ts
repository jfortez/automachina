import { drizzle } from "drizzle-orm/node-postgres";
import { getGeneratorsFunctions, seed } from "drizzle-seed";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import * as orgSchema from "./schema/organizations";

async function main() {
	const f = getGeneratorsFunctions();
	const db = drizzle(env.DATABASE_URL);

	const { user } = await auth.api.signUpEmail({
		body: {
			email: f.email().generate(),
			password: "password",
			name: f.fullName().generate(),
		},
	});

	// await seed(db, { ...orgSchema }).refine(() => ({
	//   organizations: {
	//     count: 2,
	//   },
	// }));
}

main();
