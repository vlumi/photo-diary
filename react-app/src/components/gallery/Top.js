import React from "react";
import PropTypes from "prop-types";
import { Redirect, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import galleryService from "../../services/galleries";

import Title from "./Title";
import ListBody from "./ListBody";
import Stats from "./Stats";
import Empty from "./Empty";
import Full from "./Full";
import Year from "./Year";
import Month from "./Month";
import Day from "./Day";
import Photo from "./Photo";

import GalleryModel from "../../models/Gallery";

import config from "../../lib/config";
import theme from "../../lib/theme";

const Top = ({ user, lang, countryData, stats = false }) => {
  const [galleries, setGalleries] = React.useState(undefined);
  const [gallery, setGallery] = React.useState(undefined);
  const [error, setError] = React.useState("");

  const { t } = useTranslation();

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  if (gallery && gallery.id() !== galleryId) {
    setGallery(undefined);
  }

  if (gallery && gallery.hasTheme()) {
    theme.setTheme(gallery.theme());
  } else {
    theme.setTheme(config.DEFAULT_THEME);
  }

  React.useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => {
        const gals = returnedGalleries.map((gallery) => GalleryModel(gallery));
        setGalleries(gals);
      })
      .catch((error) => setError(error.message));
  }, [user]);
  React.useEffect(() => {
    if (!galleryId) {
      return;
    }
    galleryService
      .get(galleryId)
      .then((loadedGallery) => {
        const gallery = GalleryModel(loadedGallery);
        if (gallery.hasTheme()) {
          theme.setTheme(gallery.theme());
        }
        setGallery(gallery);
      })
      .catch((error) => setError(error.message));
  }, [galleryId, user]);

  if (error) {
    theme.setTheme("grayscale");
    return <div className="error">Loading failed</div>;
  }

  if (!galleries) {
    return <div>{t("loading")}</div>;
  }
  if (!galleryId) {
    if (galleries.length === 1) {
      return <Redirect to={galleries[0].lastPath()} />;
    }

    const galleriesMatchingHostname = galleries.filter((gallery) =>
      gallery.matchesHostname(window.location.hostname)
    );
    if (config.DEFAULT_GALLERY) {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === config.DEFAULT_GALLERY
      );
      if (targetGallery) {
        return <Redirect to={targetGallery.lastPath()} />;
      }
    }
    if (galleriesMatchingHostname.length === 1) {
      return <Redirect to={galleriesMatchingHostname[0].lastPath()} />;
    }

    if (galleries.length === 0) {
      return <i>{t("empty")}</i>;
    }

    return (
      <>
        <h2>
          <span className="title">{t("nav-galleries")}</span>
        </h2>
        <div id="content">
          <ListBody galleries={galleries} />
        </div>
      </>
    );
  }

  if (!gallery) {
    return <div>{t("loading")}</div>;
  }

  if (!gallery.includesPhotos()) {
    return (
      <Empty gallery={gallery}>
        <Title
          galleries={galleries}
          gallery={gallery}
          context={stats ? "gallery-stats" : "gallery"}
        />
      </Empty>
    );
  }
  if (stats) {
    return (
      <Stats gallery={gallery} lang={lang} countryData={countryData}>
        <Title
          galleries={galleries}
          gallery={gallery}
          context="gallery-stats"
        />
      </Stats>
    );
  }
  if (!year) {
    return (
      <Full gallery={gallery}>
        <Title
          galleries={galleries}
          gallery={gallery}
          context="gallery"
          view="year"
        />
      </Full>
    );
  }
  if (!month) {
    return (
      <Year gallery={gallery} year={year} lang={lang} countryData={countryData}>
        <Title
          galleries={galleries}
          gallery={gallery}
          context="gallery"
          view="month"
        />
      </Year>
    );
  }
  if (!day) {
    return (
      <Month
        gallery={gallery}
        year={year}
        month={month}
        lang={lang}
        countryData={countryData}
      >
        <Title
          galleries={galleries}
          gallery={gallery}
          context="gallery"
          view="day"
        />
      </Month>
    );
  }
  if (!photoId) {
    return (
      <Day
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        lang={lang}
        countryData={countryData}
      >
        <Title
          galleries={galleries}
          gallery={gallery}
          context="gallery"
          view="day"
        />
      </Day>
    );
  }
  const photo = gallery.photo(year, month, day, photoId);
  return (
    <Photo
      gallery={gallery}
      year={year}
      month={month}
      day={day}
      photo={photo}
      lang={lang}
      countryData={countryData}
    >
      <Title
        galleries={galleries}
        gallery={gallery}
        context="gallery"
        view="photo"
      />
    </Photo>
  );
};
Top.propTypes = {
  user: PropTypes.object,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
  stats: PropTypes.bool,
};
export default Top;
