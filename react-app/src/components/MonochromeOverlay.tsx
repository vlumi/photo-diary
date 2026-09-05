import React from "react";
import styled from "@emotion/styled";

// The monochrome theme effect is a saturation-blend overlay rather
// than `filter: grayscale()` on <html>. A root filter is applied at
// the viewport level in Gecko — top layer included — so a filtered
// root desaturates even a top-layer <dialog>, and the theme picker's
// swatches (whose whole point is showing other themes' colours) came
// out gray. Blending only affects what paints beneath the overlay in
// stacking order; the picker's <dialog> in the top layer paints above
// it in every engine.
//
// Rendered inside #root, not portaled to <body>: the Photo view's
// fullscreen button calls requestFullscreen() on #root, which puts
// #root itself in the top layer. A body-level sibling would be left
// beneath it and the whole fullscreened app would paint in colour.
// As a descendant it rides along and keeps covering the content.
// z-index is the max so every in-flow overlay (the app's ladder tops
// out at 2500) is beneath it; top-layer dialogs are above regardless.
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: var(--monochrome-overlay, transparent);
  mix-blend-mode: saturation;
  z-index: 2147483647;
`;

const MonochromeOverlay = (): React.ReactElement => <Overlay aria-hidden />;

export default MonochromeOverlay;
