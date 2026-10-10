# yogipatel.me

Personal portfolio of Yogi Patel. Static site served by GitHub Pages from the root of this repository (custom domain in `CNAME`).

No build step, no frameworks. Edit the files directly and commit.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole site. Each section starts with a `<!-- ===== 0n Name ===== -->` comment. |
| `css/style.css` | All styles. Design tokens (colours, fonts, spacing) are the `:root { … }` block at the top. |
| `js/main.js` | Navigation, scroll-spy, count-up, video dialog, gallery lightbox, contact form. Vanilla JS, no dependencies. |
| `images/` | Optimised WebP/PNG derivatives only (see below). |
| `docs/YogiPatelResume.pdf` | Resume linked from the nav, hero, About and footer. Replace the file to update it. |
| `tools/compress.py` | The Pillow script that produced `images/` from the original photos. Not used by the site. |

## Common edits

- **Change text**: find the section in `index.html` and edit the text in place.
- **Add an experience bullet**: add an `<li>` inside the role's `<ul class="bullets">`.
- **Add a gallery image**: export it, drop a 480px-tall thumb into `images/<gallery>/thumb/` and a ≤1600px version into `images/<gallery>/lb/`, then add one `<img>` line to the matching `<template id="gallery-…">` in `index.html`.
- **Add a project card**: copy an existing `<li class="card">` block; for a YouTube video set `data-video` to the video id and `data-title` to its name.
- **Change colours**: edit the hex values in the `:root` block of `css/style.css`.

## Regenerating images

Keep original photos outside the repo. With Python 3 and Pillow installed:

```
python tools/compress.py <folder-with-original-images-layout> <path-to-this-repo>
```

## Contact form

The form posts to Formcarry (`https://formcarry.com/s/4HRTXBNZ8Vv`). Submissions arrive in the Formcarry dashboard; no server code lives in this repo.
