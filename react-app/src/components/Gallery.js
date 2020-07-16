import React from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";

import galleryService from "../services/galleries";

const Gallery = ({ galleries }) => {
  const [gallery, setGallery] = React.useState(undefined);

  const galleryId = useParams().galleryId;

  React.useEffect(() => {
    console.log("loading");
    galleryService.get(galleryId).then((loadedGallery) => {
      console.log("got gallery", loadedGallery);
      setGallery(loadedGallery);
    });
  }, [galleryId]);

  console.log("here", gallery);
  if (!gallery) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }
  console.log("gallery", gallery);
  return (
    <>
      <h2>{gallery.title}</h2>
      <div>Photos: </div>
      <ul>
        {Object.keys(gallery.photos)
          .sort((a, b) => a - b)
          .map((year) => {
            return (
              <li key={year}>
                {year}
                <ul>
                  {Object.keys(gallery.photos[year])
                    .sort((a, b) => a - b)
                    .map((month) => {
                      return (
                        <li key={year * 100 + month}>
                          {month}
                          <ul>
                            {Object.keys(gallery.photos[year][month])
                              .sort((a, b) => a - b)
                              .map((day) => {
                                return (
                                  <li key={year * 10000 + month * 100 + day}>
                                    {day}
                                    <ul>
                                      {gallery.photos[year][month][day].map(
                                        (photo) => {
                                          return (
                                            <li key={photo.id}>{photo.id}</li>
                                          );
                                        }
                                      )}
                                    </ul>
                                  </li>
                                );
                              })}
                          </ul>
                        </li>
                      );
                    })}
                </ul>
              </li>
            );
          })}
      </ul>
    </>
  );
};
Gallery.propTypes = {
  gallery: PropTypes.object,
};

export default Gallery;
