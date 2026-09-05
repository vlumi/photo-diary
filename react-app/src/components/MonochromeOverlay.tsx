import React from "react";
import { createPortal } from "react-dom";
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
// Portaled to <body> so it sits in the root stacking context and
// blends against the canvas too, not just #root's subtree. z-index
// is the max so every in-flow overlay (the app's ladder tops out at
// 2500) is beneath it; the top layer is above regardless.
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: var(--monochrome-overlay, transparent);
  mix-blend-mode: saturation;
  z-index: 2147483647;
`;

const MonochromeOverlay = (): React.ReactPortal =>
  createPortal(<Overlay aria-hidden />, document.body);

export default MonochromeOverlay;
