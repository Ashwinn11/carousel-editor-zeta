# Still Carousel Studio

A Vite carousel editor for making slide images and exporting them as a ZIP. Upload images in order, add text independently to each slide, and export a ZIP containing only the rendered PNGs.

## Run locally

```sh
npm install
npm run dev
```

## Vercel sharing

Click **Export ZIP** to download the PNG-only archive locally or create an iPhone download link. Each upload is kept as its own ZIP in public Blob storage. Open **ZIP storage** in the top bar to copy a link again, download an archive again, or delete individual ZIPs. **Delete all** clears the storage. Anyone with a link can download its ZIP.

The `/api/share-upload` function issues short-lived upload tokens, lists stored ZIPs, and supports individual or bulk deletion. `BLOB_READ_WRITE_TOKEN` is supplied by the Vercel Blob integration and stays on the server.

See [AGENTS.md](./AGENTS.md) for the editor defaults and agent workflow, and [public/SKILL.md](./public/SKILL.md) for the carousel hooks and writing rules. The deployed skill is available at https://carousel-editor-zeta.vercel.app/SKILL.md.
