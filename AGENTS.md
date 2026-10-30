# Agent workflow for Still Carousel Studio

Create carousels through the editor UI or the documented `window.stillCarousel` interface. Upload one image per slide in order, add title first and subtitle second, review every slide, then export. Text and formatting belong only to their slide.

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

Cover hierarchy rule: a bracketed continuation below a headline must be smaller than the main title while retaining the same outline and no background. Keep it on a new line in the title layer. The renderer automatically scales parenthetical `(…)` and bracketed `[…]` continuation paragraphs to 36/46 (about 78%) of the title size, including wrapping, preview, and export. Ordinary headline line breaks keep the main title size.
