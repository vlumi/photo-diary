import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";

import "./themes.css";
import "./App.css";

import User from "./models/User";
import TopMenu from "./components/TopMenu";
import Top from "./components/gallery/Top";

import config from "./lib/config";
import token from "./lib/token";

const registerCountryData = (lang) => {
  const countryData = require("i18n-iso-countries");
  try {
    countryData.registerLocale(
      require("i18n-iso-countries/langs/" + lang + ".json")
    );
  } catch (err) {
    // Fall back to English
    countryData.registerLocale(require("i18n-iso-countries/langs/en.json"));
  }
  return countryData;
};

const App = () => {
  const [user, setUser] = React.useState(undefined);
  const [lang, setLang] = React.useState(config.DEFAULT_LANGUAGE);
  const [countryData, setCountryData] = React.useState(
    registerCountryData(lang)
  );

  const { i18n } = useTranslation();
  i18n.on("languageChanged", (lang) => {
    setLang(lang);
    setCountryData(registerCountryData(lang));
  });
  const storedLang = window.localStorage.getItem("lang");
  if (storedLang && storedLang !== lang) {
    i18n.changeLanguage(storedLang);
  } else if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }

  if (!user) {
    const storedUserJson = window.localStorage.getItem("user");
    if (storedUserJson) {
      const storedUser = User(JSON.parse(storedUserJson));
      token.setToken(storedUser.token());
      setUser(storedUser);
    }
  }

  return (
    <>
      <Helmet>
        <title>Photo diary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <TopMenu user={user} setUser={setUser} lang={lang} />
      <Router>
        <Switch>
          <Route path="/g/:galleryId/stats">
            <Top
              user={user}
              lang={lang}
              countryData={countryData}
              stats={true}
            />
          </Route>
          <Route path="/g/:galleryId/:year/:month/:day/:photoId">
            <Top user={user} lang={lang} countryData={countryData} />
          </Route>
          <Route path="/g/:galleryId/:year?/:month?/:day?">
            <Top user={user} lang={lang} countryData={countryData} />
          </Route>
          <Route path="/g">
            <Top user={user} lang={lang} countryData={countryData} />
          </Route>
          <Route path="/">
            <Redirect to="/g" />
          </Route>
        </Switch>
      </Router>
    </>
  );
};

export default App;
