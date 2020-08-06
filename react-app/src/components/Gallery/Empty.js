import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";

import Link from "./Link";

import useKeyPress from "../../lib/keypress";

const Empty = ({ children, gallery }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect("/g");
  });

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Redirect to={redirect} />;
  }
  const style = { visibility: "hidden" };
  return (
    <>
      <Helmet>
        <title>{gallery.title()}</title>
      </Helmet>
      <h2>
        <span style={style}>⇤</span>
        <span style={style}>←</span>
        <Link gallery={gallery}>
          <span className="title">
            <i>Empty</i>
          </span>
        </Link>
        <span style={style}>→</span>
        <span style={style}>⇥</span>
      </h2>
      {children}
      <i>Empty</i>
    </>
  );
};
Empty.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
};
export default Empty;
