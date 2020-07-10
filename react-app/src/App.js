import React, { useState, useEffect } from "react";
import "./App.css";

import Galleries from "./components/Galleries";
import galleryService from "./services/galleries";

const App = () => {
  const [galleries, setGalleries] = useState([]);

  useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => setGalleries(returnedGalleries));
  }, []);

  return (
    <div>
      <ul>
        <Galleries galleries={galleries} />
      </ul>
    </div>
  );
};

export default App;
