# Screenshot image prompts

The screenshot fixture uses 7 photos for the July month-view tiles + photo modal. Currently filled by `fetch.mjs` from NASA's public image library (placeholders), but better long-term is **obviously-AI-generated, surreal/whimsical images** — sets the right "this is a demo, not someone's actual diary" tone and avoids any "wait, are those real?" friction.

Replace each file at `photos/<filename>.jpg` and re-run the screenshot capture. The seed reads files by name; the synthesised EXIF in `seed.mjs` (camera, location, focal length, etc.) stays put.

| Filename | EXIF context | Suggested prompt |
|---|---|---|
| `GSFC_20171208_Archive_e001465.jpg` | Reykjavik, 10am, Fujifilm X-T5 + 23mm f/2.8 | A puffin wearing tiny round glasses reading a newspaper on a black-sand beach, Icelandic mountains behind, soft overcast light, 35mm-equivalent lens look. |
| `KSC-20180418-PH_FWM01_0013.jpg` | Cape Canaveral, 2pm, Canon R5 + 70mm f/5.6 | An astronaut having a picnic on a folding chair in front of a launching rocket, palm trees, deep-saturated tropical sky. |
| `PIA04216.jpg` | Tromsø, 9pm, Sony A7 IV + 16mm f/2.8, 4s, ISO 1600 | Aurora borealis shaped like a sleeping cat curled around a Norwegian fjord, long-exposure star trails, ultrawide vista. |
| `PIA04220.jpg` | Tokyo, 9am, Nikon Z8 + 50mm f/4 | A capybara in a salaryman suit waiting at a Shibuya crossing, neon billboards, slight tilt-shift miniature effect. |
| `PIA04634.jpg` | Rome, 5pm, Leica Q2 + 28mm f/5.6 | A Vespa scooter parked outside the Colosseum, but the Colosseum is made entirely of stacked espresso cups, golden hour, Leica-rendering vibes. |
| `PIA04921.jpg` | Helsinki, 11am, Fujifilm X-T5 + 23mm f/1.4 | A reindeer sipping coffee at an outdoor café in Helsinki's Senate Square, snow on the cobblestones, shallow depth of field. |
| `PIA05445.jpg` | Queenstown, 4pm, Canon R5 + 35mm f/8 | A giant inflatable rubber duck floating on Lake Wakatipu with the Remarkables in the background, bright afternoon light, deep-focus landscape. |

## Notes for whoever generates them

- **Aspect:** any aspect ratio works; sharp resizes during seed. Landscape compositions read best in the month-view thumbnails (600×200 box crop).
- **Style:** obviously AI — surreal mashups, unreal physics, slight uncanny valley. Avoid the photorealistic "could be Unsplash" look.
- **Resolution:** 1500×1000 or thereabouts is plenty; the seed downscales to the rendition ladder anyway.
- **Licensing:** US Copyright Office has consistently ruled AI-only output uncopyrightable (no human authorship). Generate freely.
