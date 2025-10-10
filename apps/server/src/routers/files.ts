import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createBucket, s3 } from "@/lib/s3";
import { protectedProcedure, router } from "../lib/trpc";

export const fileRouter = router({
	uploadConfig: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				bucket: z.string().optional(), // Defaults to organizationId
			}),
		)
		.query(async ({ input }) => {
			const bucket = input.bucket || input.organizationId;

			// Ensure bucket exists
			await createBucket(bucket);

			return {
				success: true,
				bucket,
			};
		}),

	delete: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const bucket = input.bucket || input.organizationId;

			try {
				await s3.send(
					new DeleteObjectCommand({
						Bucket: bucket,
						Key: input.key,
					}),
				);

				return { success: true };
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete file",
				});
			}
		}),
});
