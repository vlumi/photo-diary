import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

import "./themes.css";
import "./App.css";

import Galleries from "./components/Galleries";
import Gallery from "./components/Gallery";
import Stats from "./components/Stats";

import galleryService from "./services/galleries";
import statService from "./services/stats";

import config from "./utils/config";
import theme from "./utils/theme";
theme.setTheme(config.DEFAULT_THEME);

const App = () => {
  const [galleries, setGalleries] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => setGalleries(returnedGalleries));
    statService.getGlobal().then((returnedStats) => setStats(returnedStats));
  }, []);

  return (
    <>
      <Router>
        <Switch>
          <Route path="/g/:galleryId/:year/:month/:day/:photoId">
            <Gallery galleries={galleries} />
          </Route>
          <Route path="/g/:galleryId/:year?/:month?/:day?">
            <Gallery galleries={galleries} />
          </Route>
          <Route path="/g">
            {config.DEFAULT_GALLERY ? (
              <Redirect to={`/g/${config.DEFAULT_GALLERY}`} />
            ) : (
              <Galleries galleries={galleries} />
            )}
          </Route>
          <Route path="/stats/:galleryId">
            <Stats stats={stats} />
          </Route>
          <Route path="/stats">
            {config.DEFAULT_GALLERY ? (
              <Redirect to={`/stats/${config.DEFAULT_GALLERY}`} />
            ) : (
              <Stats stats={stats} />
            )}
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
