import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { Helmet } from "react-helmet";

import "./themes.css";
import "./App.css";

import Galleries from "./components/Galleries";
import GalleryTop from "./components/GalleryTop";

const App = () => {
  return (
    <>
      <Helmet>
        <title>Photo diary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <Router>
        <Switch>
          <Route path="/g/:galleryId/:year/:month/:day/:photoId">
            <GalleryTop />
          </Route>
          <Route path="/g/:galleryId/:year?/:month?/:day?">
            <GalleryTop />
          </Route>
          <Route path="/g">
            <Galleries />
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
