# Still Carousel Studio: Agent Guide

Use the live editor at https://carousel-editor-zeta.vercel.app. This file is also available at https://carousel-editor-zeta.vercel.app/AGENTS.md.

Before writing slide copy, read the carousel writing skill at https://carousel-editor-zeta.vercel.app/SKILL.md. It contains the 18 hook references, writing rules, and output format. This guide covers editor operation and export; the skill covers copywriting.

## Defaults

- Export ratio defaults to **9:16**, at **1080 × 1920 px**.
- Add the title first: centered, TikTok Sans Classic, black fixed **6 px** outline, font size **46**, paragraph zoom **90%**. When alone, center it vertically.
- Add the subtitle second: centered, white background at fixed **88% opacity**, font size **36**, paragraph zoom **90%**. The editor positions it below the title.
- Keep the title larger than the subtitle. Text wraps naturally; adjust font size and paragraph zoom to keep the slide readable and balanced.
- Outline width and background opacity are fixed. Do not look for controls or change them.
- Text layers and formatting are per slide. Changing one slide does not change the others.
- Default export contains only rendered slide PNGs in a ZIP. Do not add source images, project files, or other files unless specifically requested.

## Create and export

1. Upload images in slide order using the upload controls or `#imageInput`.
2. Select each slide from the slide list or filmstrip.
3. Click **Add text** once for the title and again for the subtitle. Replace the placeholder in **Your words**.
4. Review every slide. Adjust font, color, size, paragraph zoom, rotation, or placement only when needed.
5. Keep the ratio at 9:16 unless a different ratio is requested.
6. Click **Export ZIP**. Use **Download ZIP** for a local file or **Create iPhone link** to store a ZIP and copy its download link.

## Stored ZIPs

Open **ZIP storage** in the top bar to see saved archives. Each item has actions to copy its link, download it again, or delete it. **Delete all** removes every stored ZIP. A ZIP remains stored until deleted.

## Browser controls

- `#imageInput`: multi-image upload input.
- `#ratioSelect`: output aspect ratio.
- `#exportAll`: build the PNG-only ZIP.
- `#shareReadyZip`: upload the current ZIP and copy an iPhone link.
- `#openStorage`: open the stored ZIP list.

If editing through the UI, use the visible controls and inspect the rendered slide before exporting. The editor warns before refresh or navigation if edits are unsaved.
