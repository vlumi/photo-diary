import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import TopMenuLang from "./TopMenuLang";
import TopMenuButton from "./TopMenuButton";
import Logout from "./Logout";

import { useUserStore, useLoginModalStore } from "../stores";

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
const UserName = styled.span`
  margin: auto 10px;
  color: var(--header-color);
  flex-grow: 1;
  text-align: left;
  font-weight: bold;
`;

const TopMenu = (): React.ReactElement => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const openLoginModal = useLoginModalStore((s) => s.open);

  // Two states: logged in (show user name + lang switcher + logout) vs not
  // (show lang switcher + a Log in button that opens the floating modal).
  // The login form itself lives in the modal — the top menu no longer
  // expands inline.
  return (
    <Root>
      <Container>
        {user ? (
          <>
            <UserName>{user.id()}</UserName>
            <TopMenuLang />
            <Logout />
          </>
        ) : (
          <>
            <TopMenuLang />
            <TopMenuButton onClick={openLoginModal}>{t("login")}</TopMenuButton>
          </>
        )}
      </Container>
    </Root>
  );
};
export default TopMenu;
