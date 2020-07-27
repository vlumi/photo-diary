import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import config from "../utils/config";

import Toggleable from "./Toggleable";
import Login from "./Login";
import Logout from "./Logout";
import User from "./User";

const TopMenu = ({ user, setUser, lang }) => {
  const { i18n } = useTranslation();

  const handleLangChange = (event) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    window.localStorage.setItem("lang", lang);
  };

  const renderUserInfo = () => {
    return (
      <>
        <User user={user} />{" "}
        <span className="lang">
          <form>
            <label className={lang === "en" ? "checked" : ""}>
              <input
                type="radio"
                value="en"
                checked={lang === "en"}
                onChange={handleLangChange}
              />
              English
            </label>
            |
            <label className={lang === "fi" ? "checked" : ""}>
              <input
                type="radio"
                value="fi"
                checked={lang === "fi"}
                onChange={handleLangChange}
              />
              Suomi
            </label>
            |
            <label className={lang === "ja" ? "checked" : ""}>
              <input
                type="radio"
                value="ja"
                checked={lang === "ja"}
                onChange={handleLangChange}
              />
              日本語
            </label>
          </form>
        </span>
      </>
    );
  };
  const renderContent = () => {
    if (user) {
      return (
        <>
          <span>
            {renderUserInfo()}
            <Logout setUser={setUser} />
          </span>
        </>
      );
    }
    return (
      <Toggleable
        showLabel="Login"
        hideLabel="╳"
        defaultBody={renderUserInfo()}
      >
        <Login setUser={setUser} />
      </Toggleable>
    );
  };
  return <div className="top-menu">{renderContent()}</div>;
};
TopMenu.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func,
};
export default TopMenu;
