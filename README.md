# Archean mantle buoyancy

A one-page teaching demo of how melt depletion — and, much more weakly, loss of H₂O and CO₂ — changes the density of mantle lithosphere. The scientific point is compositional: hotter Archean mantle melted more, so the residue is more depleted (higher Mg#, less garnet and clinopyroxene) than a modern residue of the same lithosphere thickness.

Open `index.html` locally, or the GitHub Pages URL after the site is published:

**https://andrew-traversemt.github.io/archean-mantle-buoyancy/**

No build step. Static HTML, CSS, and JavaScript from the repository root.

## What is calculated

- Melt fraction from mantle potential temperature: Katz, Spiegelman & Langmuir (2003)
- Residue density versus melt fraction: Schutt & Lesher (2006) at 4 GPa
- Alternative xenolith curve (shown, not used for the verdict): Lee (2003) ρ–Mg#
- Archean versus modern potential temperature: Herzberg, Condie & Korenaga (2010)
- Volatile density effects: Smyth et al. (2006) and a small accessory hydrous/carbonate term

All citations are on the page. If two published density curves disagree, the page names both and uses Schutt & Lesher.

## GitHub Pages

Publish the **root** of this branch (or `main` after review). Do not merge this pull request unless you intend to.

In the repository: **Settings → Pages → Build and deployment**

- Source: **Deploy from a branch**
- Branch: `cursor/archean-mantle-buoyancy-page-9a42` (to preview without merging) or `main` after merge
- Folder: `/ (root)`

The expected site URL is https://andrew-traversemt.github.io/archean-mantle-buoyancy/

## Tests

```bash
node test/science.test.js
```
