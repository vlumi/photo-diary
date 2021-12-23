import React from "react";
import PropTypes from "prop-types";
import { createGlobalStyle } from "styled-components";
import { Redirect, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import metaService from "../../services/meta";
import galleryService from "../../services/galleries";
import galleryPhotosService from "../../services/gallery-photos";

import Title from "./Title";
import Filters from "./Filters";
import ListBody from "./ListBody";
import Stats from "./Stats";
import Empty from "./Empty";
import Full from "./Full";
import Year from "./Year";
import Month from "./Month";
import Day from "./Day";
import Photo from "./Photo";

import GalleryModel from "../../models/GalleryModel";
import PhotoModel from "../../models/PhotoModel";

import collection from "../../lib/collection";
import config from "../../lib/config";
import format from "../../lib/format";
import stats from "../../lib/stats";
import theme from "../../lib/theme";

const GlobalStyles = createGlobalStyle`
html {
  --primary-color: ${(props) => props["primary-color"]};
  --primary-background: ${(props) => props["primary-background"]};
  --inactive-color: ${(props) => props["inactive-color"]};
  --header-color: ${(props) => props["header-color"]};
  --header-sub-color: ${(props) => props["header-sub-color"]};
  --header-background: ${(props) => props["header-background"]};
  filter: ${(props) => props["filter"]}
}
`;

const Gallery = ({ user, lang, countryData, isStats = false, scrollState }) => {
  const [meta, setMeta] = React.useState(undefined);
  const [galleries, setGalleries] = React.useState(undefined);
  const [gallery, setGallery] = React.useState(undefined);
  const [photos, setPhotos] = React.useState(undefined);
  const [uniqueValues, setUniqueValues] = React.useState(undefined);
  const [filters, setFilters] = React.useState({});
  const [error, setError] = React.useState("");

  const { t } = useTranslation();

  React.useEffect(() => {
    const handleScroll = () => {
      scrollState.set(window.location.pathname, window.pageYOffset);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollState]);

  const context = isStats ? "stats" : "gallery";

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  const staleGallery = gallery && gallery.id() !== galleryId;

  const selectedGallery =
    galleries && galleries.find((gallery) => gallery.id() === galleryId);

  React.useEffect(() => {
    metaService
      .getAll()
      .then((returnedMeta) => {
        setMeta(returnedMeta);
        config.PHOTO_ROOT_URL = returnedMeta.cdn || config.PHOTO_ROOT_URL;
      })
      .catch((error) => setError(error.message));
  }, []);
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
    galleryPhotosService
      .get(galleryId)
      .then((photos) => {
        const mappedPhotos = photos
          .map((photo) => PhotoModel(photo))
          .filter((photo) => !!photo);
        setPhotos(mappedPhotos);
      })
      .catch((error) => setError(error.message));
  }, [galleryId, user]);
  React.useEffect(() => {
    if (!photos) {
      return;
    }
    const newUniqueValues = photos
      .map((photo) => photo.uniqueValues())
      .reduce(
        collection.mergeObjects((a, b) => new Set([...a, ...b])),
        {}
      );
    const categoryValueFormatter = format.categoryValue(lang, t, countryData);
    Object.keys(newUniqueValues).forEach((topic) => {
      Object.keys(newUniqueValues[topic]).forEach((category) => {
        newUniqueValues[topic][category] = [...newUniqueValues[topic][category]]
          .map((value) => {
            if (value === "" || value === undefined || value === null) {
              return {
                key: stats.UNKNOWN,
                value: t("stats-unknown"),
              };
            }
            return {
              key: value,
              value: categoryValueFormatter(category)(value),
            };
          })
          .sort(format.categorySorter("key", "value")(category));
      });
    });
    setUniqueValues(newUniqueValues);
  }, [photos, lang, t, countryData]);
  React.useEffect(() => {
    if (!selectedGallery || !photos) {
      return;
    }
    const filteredPhotos = photos.filter((photo) =>
      Object.values(filters).every(
        (topicFilters) =>
          !Object.keys(topicFilters).length ||
          Object.values(topicFilters).every(
            (categoryFilters) =>
              !Object.keys(categoryFilters).length ||
              Object.values(categoryFilters).some((filter) => filter(photo))
          )
      )
    );
    setGallery(selectedGallery.withPhotos(filteredPhotos));
  }, [selectedGallery, photos, filters]);

  if (staleGallery) {
    setGallery(undefined);
    setPhotos(undefined);
    setUniqueValues(undefined);
  }

  const activeTheme =
    selectedGallery && selectedGallery.hasTheme()
      ? theme.setTheme(selectedGallery.theme())
      : theme.setTheme(config.DEFAULT_THEME);

  if (error) {
    return <div className="error">Loading failed</div>;
  }

  if (!meta || !galleries) {
    return <div>{t("loading")}</div>;
  }
  if (!galleryId) {
    if (galleries.length === 1) {
      return <Redirect to={galleries[0].path()} />;
    }

    const galleriesMatchingHostname = galleries.filter((gallery) =>
      gallery.matchesHostname(window.location.hostname)
    );
    if (galleriesMatchingHostname.length === 1) {
      return <Redirect to={galleriesMatchingHostname[0].path()} />;
    }
    if (config.DEFAULT_GALLERY) {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === config.DEFAULT_GALLERY
      );
      if (targetGallery) {
        return <Redirect to={targetGallery.path()} />;
      }
    }

    if (galleries.length === 0) {
      return <i>{t("empty")}</i>;
    }

    const escapeHTML = (str) =>
      str.replace(
        /[&<>'"]/g,
        (tag) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          }[tag])
      );

    const title = meta.name ? (
      <>{escapeHTML(meta.name)}</>
    ) : (
      <>{t("nav-galleries")}</>
    );

    const description = meta.description ? (
      <p>{escapeHTML(meta.description)}</p>
    ) : (
      <></>
    );

    return (
      <>
        <h2>
          <span className="title">{title}</span>
        </h2>
        {description}
        <div id="content">
          <ListBody galleries={galleries} />
        </div>
      </>
    );
  }

  const renderContent = () => {
    if (staleGallery || !gallery || !uniqueValues) {
      return <div>{t("loading")}</div>;
    }

    if (isStats) {
      return (
        <Stats
          photos={gallery.photos()}
          uniqueValues={uniqueValues}
          filters={filters}
          setFilters={setFilters}
          lang={lang}
          countryData={countryData}
          theme={activeTheme}
        >
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Stats>
      );
    }
    if (!gallery.includesPhotos()) {
      return (
        <Empty gallery={gallery}>
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Empty>
      );
    }
    if (!year) {
      return (
        <Full gallery={gallery}>
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Full>
      );
    }
    if (!month) {
      return (
        <Year
          gallery={gallery}
          year={year}
          lang={lang}
          countryData={countryData}
          theme={activeTheme}
        >
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
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
            context={context}
            year={year}
            month={month}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
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
            context={context}
            year={year}
            month={month}
            day={day}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
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
          context={context}
          year={year}
          month={month}
          day={day}
        />
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
        />
      </Photo>
    );
  };

  return (
    <>
      <GlobalStyles
        primary-color={activeTheme.get("primary-color")}
        primary-background={activeTheme.get("primary-background")}
        inactive-color={activeTheme.get("inactive-color")}
        header-color={activeTheme.get("header-color")}
        header-sub-color={activeTheme.get("header-sub-color")}
        header-background={activeTheme.get("header-background")}
        filter={activeTheme.get("filter")}
      />
      {renderContent()}
    </>
  );
};
Gallery.propTypes = {
  user: PropTypes.object,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
  isStats: PropTypes.bool,
  scrollState: PropTypes.object.isRequired,
};
export default Gallery;
