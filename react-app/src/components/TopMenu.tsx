import React from "react";
import styled from "@emotion/styled";

import TopMenuLang from "./TopMenuLang";
import UserMenu from "./UserMenu";

const Root = styled.div`
  height: 25px;
  color: var(--header-color);
  background: var(--header-background);
  margin: 0;
  padding: 0;
  font-size: small;
`;
const Container = styled.span`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  flex-wrap: nowrap;
  white-space: nowrap;
`;

const TopMenu = (): React.ReactElement => (
  <Root>
    <Container>
      <TopMenuLang />
      <UserMenu />
    </Container>
  </Root>
);
export default TopMenu;
