import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { filename, contentType, userId } = body;

    if (!filename || !contentType || !userId) {
      return NextResponse.json({ error: 'Missing filename, contentType, or userId' }, { status: 400 });
    }

    // 3. Setup S3 Client for Cloudflare R2
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error('Cloudflare R2 credentials are not configured.');
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 4. Generate unique key for the file
    // Format: users/{userId}/avatar/{timestamp}_{filename}
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `users/${userId}/avatar/${timestamp}_${safeFilename}`;

    // 5. Create presigned URL command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    // URL expires in 5 minutes (300 seconds)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 6. Return the presigned URL and the final public URL where the file will be accessible
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://${bucketName}.${accountId}.r2.dev`;
    const finalUrl = `${publicUrlBase.replace(/\/$/, '')}/${objectKey}`;

    return NextResponse.json({
      presignedUrl,
      finalUrl,
      objectKey,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
