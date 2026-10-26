import { handleUpload } from '@vercel/blob/client';
import { del, list } from '@vercel/blob';

const PREFIX = 'carousel-shares/';
const MAX_SIZE = 250 * 1024 * 1024;

async function listShares() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, limit: 100, ...(cursor ? { cursor } : {}) });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function validPath(pathname) {
  return typeof pathname === 'string' && /^carousel-shares\/[a-z0-9][a-z0-9._-]*\.zip$/i.test(pathname);
}

export async function GET() {
  try {
    const blobs = await listShares();
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return Response.json({ blobs: blobs.map(({ pathname, size, uploadedAt }) => ({ pathname, size, uploadedAt })) });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not list ZIP storage.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json(await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!validPath(pathname)) throw new Error('Invalid ZIP path.');
        return {
          allowedContentTypes: ['application/zip'],
          maximumSizeInBytes: MAX_SIZE,
          validUntil: Date.now() + 5 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60,
        };
      },
      onUploadCompleted: async () => {},
    }));
  } catch (error) {
    return Response.json({ error: error.message || 'Could not authorize ZIP upload.' }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.all === true) {
      const blobs = await listShares();
      if (blobs.length) await del(blobs.map((blob) => blob.url));
      return Response.json({ deleted: blobs.length });
    }
    if (!validPath(body.pathname)) return Response.json({ error: 'Invalid ZIP path.' }, { status: 400 });
    await del(body.pathname);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not delete ZIP storage.' }, { status: 500 });
  }
}
