# Rubik ExtraBold

`Rubik-ExtraBold.ttf` is the static Rubik 800 face, fetched from Google Fonts
(`https://fonts.googleapis.com/css2?family=Rubik:wght@800`, which serves TrueType when the
request carries no browser User-Agent).

It is committed rather than fetched at build time so `scripts/brand-icons.mjs` is
reproducible offline. That script re-fetches it here only if the file is missing.

It exists because the FetePass lockup's wordmark is **live text**, not outlines, and a
rasteriser does not fetch the Google Fonts `@import` in the SVG — librsvg has no network.
Without this file the wordmark silently renders in DejaVu Sans; `brand-icons.mjs` refuses
to run if the family does not resolve.

`@fontsource/rubik` cannot be used in its place: it ships woff/woff2 only, and fontconfig
registers its woff2 under the family name `Rubik Light`, so `Rubik:weight=extrabold`
resolves to DejaVu Sans Bold.

Licence: SIL Open Font License 1.1 — see `OFL.txt`. Copyright 2015 The Rubik Project
Authors (https://github.com/googlefonts/rubik).
