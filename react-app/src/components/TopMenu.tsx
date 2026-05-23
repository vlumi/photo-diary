import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import TopMenuLang from "./TopMenuLang";
import TopMenuButton from "./TopMenuButton";
import Login from "./Login";
import Logout from "./Logout";

import { useUserStore } from "../stores";

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
const ToggleBlock = styled("span", {
  shouldForwardProp: (prop) => prop !== "$visible",
})<{ $visible: boolean }>`
  display: ${(props) => (props.$visible ? "" : "none")};
`;
const HideButton = styled(TopMenuButton)`
  color: var(--header-color);
  background: var(--header-background);
  padding: 0;
  width: 23px;
`;

const TopMenu = (): React.ReactElement => {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = React.useState(false);
  const user = useUserStore((s) => s.user);

  const toggleShowLogin = () => setShowLogin(!showLogin);

  const renderContent = () => {
    if (user) {
      if (showLogin) {
        setShowLogin(false);
      }
      return (
        <Container>
          <UserName>{user.id()}</UserName> <TopMenuLang />
          <Logout />
        </Container>
      );
    }
    return (
      <>
        <ToggleBlock $visible={!showLogin}>
          <Container>
            <TopMenuLang />
            <TopMenuButton onClick={toggleShowLogin}>
              {t("login")}
            </TopMenuButton>
          </Container>
        </ToggleBlock>
        <ToggleBlock $visible={showLogin}>
          <Container>
            <Login />
            <HideButton onClick={toggleShowLogin}>╳</HideButton>
          </Container>
        </ToggleBlock>
      </>
    );
  };
  return <Root>{renderContent()}</Root>;
};
export default TopMenu;
