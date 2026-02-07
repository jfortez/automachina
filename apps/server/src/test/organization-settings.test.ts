import type { inferProcedureInput } from "@trpc/server";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("Organization Settings Management", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let myOrg: Awaited<ReturnType<typeof ctx.caller.organization.create>>;
	beforeAll(async () => {
		ctx = await setupTestContext();

		myOrg = await ctx.caller.organization.create({
			name: "Test Organization",

			code: `test-org-${Date.now()}`,
		});
	});

	it.sequential("should create organization settings", async () => {
		const { caller } = ctx;

		const input: inferProcedureInput<
			AppRouter["organization"]["settings"]["create"]
		> = {
			organizationId: myOrg.id,
			language: "es",
			currency: "USD",
			taxRegion: "ECUADOR",
			fiscalProvider: "sri",
			fiscalProviderConfig: {
				environment: "testing",
				apiKey: "test-key",
			},
		};

		const result = await caller.organization.settings.create(input);

		expect(result.settings).toBeDefined();
		expect(result.settings.organizationId).toBe(myOrg.id);
		expect(result.settings.language).toBe("es");
		expect(result.settings.currency).toBe("USD");
		expect(result.settings.taxRegion).toBe("ECUADOR");
		expect(result.settings.fiscalProvider).toBe("sri");
	});

	it.sequential("should get organization settings", async () => {
		const { caller } = ctx;

		const result = await caller.organization.settings.get({
			organizationId: myOrg.id,
		});

		expect(result.settings).toBeDefined();
		expect(result.settings.organizationId).toBe(myOrg.id);
	});

	it.sequential("should update organization settings", async () => {
		const { caller } = ctx;

		const { settings: existing } = await caller.organization.settings.get({
			organizationId: myOrg.id,
		});

		const result = await caller.organization.settings.update({
			id: existing.id,
			language: "en",
			currency: "EUR",
			decimalPrecision: 4,
		});

		expect(result.settings.language).toBe("en");
		expect(result.settings.currency).toBe("EUR");
		expect(result.settings.decimalPrecision).toBe(4);
	});

	it.sequential("should fail to create duplicate settings", async () => {
		const { caller } = ctx;

		const input: inferProcedureInput<
			AppRouter["organization"]["settings"]["create"]
		> = {
			organizationId: myOrg.id,
			language: "es",
		};

		await expect(caller.organization.settings.create(input)).rejects.toThrow();
	});
});
