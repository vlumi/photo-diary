import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

const Root = styled.div`
  padding: 24px 16px;
`;
const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 1.2em;
`;
const Body = styled.p`
  margin: 0;
  color: var(--inactive-color);
`;

// Single placeholder used by every /m/* sub-route until that page is
// wired up. The translation keys (`manage-page-<slug>-title` /
// `-blurb`) carry the page-specific copy so the file lives empty of
// route knowledge.
const Placeholder = ({
  titleKey,
  blurbKey,
}: {
  titleKey: string;
  blurbKey: string;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Root>
      <Title>{t(titleKey)}</Title>
      <Body>{t(blurbKey)}</Body>
    </Root>
  );
};

export default Placeholder;
