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

import TopMenu from "./components/TopMenu";
import Galleries from "./components/Galleries";
import GalleryTop from "./components/GalleryTop";

import token from "./utils/token";

const App = () => {
  const [user, setUser] = React.useState(undefined);

  if (!user) {
    const storedUserJson = window.localStorage.getItem("user");
    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson);
      token.setToken(storedUser.token);
      setUser(storedUser);
    }
  }

  return (
    <>
      <Helmet>
        <title>Photo diary</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      <TopMenu user={user} setUser={setUser} />
      <Router>
        <Switch>
          <Route path="/g/:galleryId/:year/:month/:day/:photoId">
            <GalleryTop user={user} />
          </Route>
          <Route path="/g/:galleryId/:year?/:month?/:day?">
            <GalleryTop user={user} />
          </Route>
          <Route path="/g">
            <Galleries user={user} />
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
