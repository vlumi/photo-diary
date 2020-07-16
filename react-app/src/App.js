import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom";

import "./App.css";

import Galleries from "./components/Galleries";
import Gallery from "./components/Gallery";
import Stats from "./components/Stats";

import galleryService from "./services/galleries";
import statService from "./services/stats";

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
        <h1>Photo Diary</h1>
        <ul>
          <li>
            <Link to="/g">galleries</Link>
          </li>
          <li>
            <Link to="/stats">stats</Link>
          </li>
        </ul>

        <Switch>
          {/* <Route path="/gallery/:galleryId/:photoId">
            <Gallery galleries={galleries} />
          </Route> */}
          <Route path="/g/:galleryId/:year?/:month?/:day?">
            <Gallery galleries={galleries} />
          </Route>
          <Route path="/g">
            <Galleries galleries={galleries} />
          </Route>
          <Route path="/stats/:galleryId">
            <Stats stats={stats} />
          </Route>
          <Route path="/stats">
            <Stats stats={stats} />
          </Route>
          <Route path="/">
            <Redirect to="/g" />
          </Route>
        </Switch>

        <div>TODO: implement</div>
      </Router>
    </>
  );
};

export default App;
