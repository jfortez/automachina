import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createBucket, s3 } from "@/lib/s3";
import { protectedProcedure, router } from "../lib/trpc";

export const fileRouter = router({
	uploadConfig: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(), // Defaults to organizationId from context
			}),
		)
		.query(async ({ input, ctx }) => {
			const bucket = input.bucket || ctx.organizationId;

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
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const bucket = input.bucket || ctx.organizationId;

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
