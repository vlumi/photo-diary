import styled from "@emotion/styled";

// Shared panel primitive for Manage view/edit surfaces (#605).
// Each section is a bordered, slightly inset panel stacked top-to-
// bottom; SectionTitle reads as a panel header. Replaces the per-
// surface ad-hoc Section + SectionTitle styled components.

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  /* Section panels read as cards on the page background — use the
     theme's tile colour (matches /g/'s calendar tiles) so /m/ looks
     like a sibling to /g/, not a separate app. */
  background: var(--tile-background);
  /* App.css sets a global text-align: center; admin section bodies
     read left so values + form fields line up on the leading edge. */
  text-align: left;

  & + & {
    margin-top: 12px;
  }
`;

export const SectionTitle = styled.h3`
  /* Subtle gradient anchored on the foreground colour via color-mix,
     so the strip reads the same on every theme. A flat tile-bg
     tint was too loud on themes where the panel itself is white. */
  margin: -14px -16px 8px;
  padding: 10px 16px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--primary-color) 8%, transparent),
    color-mix(in srgb, var(--primary-color) 2%, transparent)
  );
  border-bottom: 1px solid var(--inactive-color);
  border-radius: 5px 5px 0 0;
  font-size: 0.95em;
  font-weight: 600;
  color: var(--primary-color);
`;

export const SectionHint = styled.p`
  margin: 0 0 8px;
  font-size: 0.8em;
  color: var(--inactive-color);
  font-style: italic;
`;
