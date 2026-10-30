import { head, list } from '@vercel/blob';

const PREFIX = 'carousel-shares/';

export async function GET(request) {
  try {
    const requestedPath = new URL(request.url).searchParams.get('path');
    let pathname = requestedPath;
    if (pathname && (!pathname.startsWith(PREFIX) || !pathname.toLowerCase().endsWith('.zip'))) {
      return Response.json({ error: 'Invalid ZIP path.' }, { status: 400 });
    }
    if (!pathname) {
      const page = await list({ prefix: PREFIX, limit: 100 });
      const latest = page.blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      pathname = latest?.pathname;
    }
    if (!pathname) return Response.json({ error: 'No shared ZIP is available yet.' }, { status: 404 });
    const blob = await head(pathname);
    const download=new URL(blob.downloadUrl);download.searchParams.set('v',String(new Date(blob.uploadedAt).getTime()));
    return new Response(null,{status:302,headers:{Location:download.href,'Cache-Control':'no-store'}});
  } catch {
    return Response.json({ error: 'No shared ZIP is available yet.' }, { status: 404 });
  }
}
