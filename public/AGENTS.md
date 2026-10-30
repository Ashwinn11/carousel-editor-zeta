# Still Carousel Studio: Agent Guide

Use the live editor at https://carousel-editor-zeta.vercel.app. This file is also available at https://carousel-editor-zeta.vercel.app/AGENTS.md.

Before writing slide copy, read the project carousel skill at https://carousel-editor-zeta.vercel.app/SKILL.md. It contains the 18 hook references, writing rules, and the output format we use. For additional structure and cover-hook techniques, consult the bundled [Carousel Writer](https://carousel-editor-zeta.vercel.app/skills/carousel-writer/SKILL.md) and [Hook Writer](https://carousel-editor-zeta.vercel.app/skills/hook-writer/SKILL.md) references. Use Hook Writer only for the carousel cover. If no brand or voice files are provided, use the user’s brief and the project skill; do not invent brand details. Project defaults and the requested output format take priority over generic recommendations in the reference skills.

## Defaults

- Export ratio defaults to **9:16**, at **1080 × 1920 px**.
- Add the title first: centered, TikTok Sans Classic, black fixed **6 px** outline, font size **46**, paragraph zoom **90%**. When alone, center it vertically.
- Add the subtitle second: centered, solid white background at fixed **100% opacity**, font size **36**, paragraph zoom **90%**. The editor positions it below the title.
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

## Cover title continuations

A parenthetical or short promise that completes the cover headline, such as “(before the scrolling starts)”, is part of the title. Keep it directly below the headline in the **same outlined title layer**, separated by a newline. Do not put it in a white-background subtitle layer. Use **Continue title on next line** (`#continueTitle`) or insert a newline in **Your words** (`#textValue`). Use a separate subtitle layer only when the copy is genuinely a distinct explanation or tip. This exception takes priority over the title-first/subtitle-second defaults.

## Structured creation and agent API

Agents may create and edit via the visible UI or `window.stillCarousel`, which uses the editor's actual slide model, renderer, and ZIP exporter. Do not recreate the renderer externally.

Open **Create / import** (also in the mobile More menu) to paste JSON, load Pinterest images, apply a preset, review a contact sheet, or save an editable project.

```json
{
  "name": "Take your morning back",
  "ratio": "9:16",
  "preset": "classic",
  "slides": [
    {
      "image": "https://i.pinimg.com/originals/path/to/photo.jpg",
      "title": "Take your morning back",
      "continuation": "(before the scrolling starts)"
    },
    {
      "image": "https://example.com/photo.jpg",
      "title": "Have one quiet moment",
      "subtitle": "Start with a page."
    }
  ]
}
```

`continuation` joins the title with a newline in the same outlined layer. It is not a boxed subtitle. Each layer supports up to 200 characters; create 1–30 slides. Ratios: `9:16`, `4:5`, `1:1`, `16:9`. Presets: `classic` (outlined title, white subtitle), `all-outline`, `paper` (white text cards). Other HTTPS images must permit CORS; Pinterest images use the editor's image endpoint. Data URLs are also supported.

Browser automation can await:

```js
await window.stillCarousel.createProject(spec);
window.stillCarousel.getProject();
window.stillCarousel.updateSlide(0, { continuation: "(before the feed)" });
window.stillCarousel.updateSlide(5, { subtitle: "Revised final tip." });
const previews = await window.stillCarousel.previewSlides(); // [{index, url}] browser blob URLs
const editableZip = await window.stillCarousel.saveProject(); // Blob
const { url, pathname } = await window.stillCarousel.exportToStorage();
```

Slide indexes start at zero. `updateSlide` edits `title`, `continuation`, `subtitle`, and/or `preset`, preserving other slides and existing formatting unless a preset is requested. Use an empty continuation/subtitle to remove it. Revoke preview blob URLs after use. Inspect previews before export. The API is a browser interface, not a server endpoint or an AI copy generator.

**Editable projects:** Save editable project ZIP exports source photos, text layers, layout and the current storage path. Reopen using **Open project**. The posting ZIP still contains only PNG slides. Save the editable project after the first storage upload to retain its stable link across sessions. Subsequent uploads from that project replace the same ZIP and retain its iPhone URL; new projects get a separate link.

**Pinterest:** Paste a public pin or board URL, load its available images, then select thumbnails in slide order. Import fetches the initial public page, not the entire board's pagination. Private or blocked pages require direct photo uploads. The server accepts only Pinterest page hosts and `i.pinimg.com` images.

**Stored ZIP preview:** In ZIP storage, choose **Preview** to see every rendered slide without saving or unzipping a file. Tap a slide to open its full-size PNG. Preview reads the ZIP in the browser and does not modify the current project.
