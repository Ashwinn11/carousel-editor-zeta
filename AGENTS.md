# Agent workflow for Still Carousel Studio

Create carousels through the editor UI. Upload one image per slide in order, add title first and subtitle second, review every slide, then export. Text and formatting belong only to their slide.

## Defaults

- First text layer is a centered title in TikTok Sans Classic with a black, fixed 6 px outline, size 46, paragraph zoom 90%, and vertical center placement.
- Second text layer is a centered subtitle with solid white background at fixed 100% opacity, size 36, and paragraph zoom 90%. Adding it places the title above it.
- Keep title larger than subtitle. Natural line wrapping is allowed. Tune font size or paragraph zoom for clear reading and hierarchy.
- Outline width and background opacity are fixed defaults. There are no editor controls for them, and agents should not set them each time.
- Output ratio defaults to 9:16 at 1080 × 1920.

## UI workflow

1. Upload the images in order using `#imageInput` or the visible upload controls.
2. Select slides with the “Select slide N” filmstrip buttons.
3. Click “Add text” once for title and again for subtitle. Replace placeholder copy in “Your words”.
4. Adjust font, color, size, paragraph zoom, rotation, or placement only as needed. A layer edit affects the selected slide only.
5. Choose the ratio in `#ratioSelect` if requested.
6. Click **Export ZIP**. Choose **Download ZIP** for a local copy or **Create iPhone link** to add a separately stored ZIP to Vercel Blob and copy its iPhone download link.

Open **ZIP storage** in the top bar to revisit any stored ZIP, copy its link, download it again, delete one ZIP, or clear the full list. Stored ZIPs remain until deleted.

The app warns before refresh/navigation if edits are unsaved. The public share URL is accessible to anyone who has it.

## Carousel copy

Before writing carousel slide copy, read [SKILL.md](./public/SKILL.md). It contains the hook library, voice rules, structure, and final cross-check. For additional structure and cover-hook techniques, consult [Carousel Writer](./public/skills/carousel-writer/SKILL.md) and [Hook Writer](./public/skills/hook-writer/SKILL.md). Use Hook Writer only for the cover; if brand or voice files are absent, follow the brief and project skill without inventing brand details. The deployed copy is available at https://carousel-editor-zeta.vercel.app/SKILL.md.
