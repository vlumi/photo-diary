import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import TopMenuLang from "./TopMenuLang";
import TopMenuButton from "./TopMenuButton";
import Login from "./Login";
import Logout from "./Logout";

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
const User = styled.span`
  margin: auto 10px;
  color: var(--inactive-color);
  flex-grow: 1;
  text-align: left;
`;
const ToggleBlock = styled.span`
  display: ${(props) => (props.visible ? "" : "none")};
`;
const HideButton = styled(TopMenuButton)`
  color: var(--header-color);
  background: var(--header-background);
  padding: 0;
  width: 23px;
`;

const TopMenu = ({ user, setUser, lang }) => {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = React.useState(false);

  const toggleShowLogin = () => setShowLogin(!showLogin);

  const renderContent = () => {
    if (user) {
      if (showLogin) {
        setShowLogin(false);
      }
      return (
        <>
          <Container>
            <User>{user.id()}</User> <TopMenuLang lang={lang} />
            <Logout setUser={setUser} />
          </Container>
        </>
      );
    }
    return (
      <>
        <ToggleBlock visible={!showLogin}>
          <Container>
            <TopMenuLang lang={lang} />
            <TopMenuButton onClick={toggleShowLogin}>
              {t("login")}
            </TopMenuButton>
          </Container>
        </ToggleBlock>
        <ToggleBlock visible={showLogin}>
          <Container>
            <Login setUser={setUser} />
            <HideButton onClick={toggleShowLogin}>╳</HideButton>
          </Container>
        </ToggleBlock>
      </>
    );
  };
  return <Root>{renderContent()}</Root>;
};
TopMenu.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func,
  lang: PropTypes.string.isRequired,
};
export default TopMenu;
