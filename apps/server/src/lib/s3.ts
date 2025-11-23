import {
	CreateBucketCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const s3 = new S3Client({
	region: "us-east-1",
	endpoint: env.S3_ENDPOINT,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY,
		secretAccessKey: env.S3_SECRET_KEY,
	},
	forcePathStyle: true,
});

export const createBucket = async (bucket: string) => {
	return await s3.send(new CreateBucketCommand({ Bucket: bucket }));
};

export const findBucket = async (bucket: string) => {
	try {
		const data = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
		return data;
	} catch {
		return undefined;
	}
};
