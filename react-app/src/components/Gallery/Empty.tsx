import React from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BsFillHouseFill } from "react-icons/bs";

import Root from "./Navigation";
import Link from "./Link";

import useKeyPress from "../../lib/keypress";

import type { Gallery } from "../../models/GalleryModel";

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
}

const Empty = ({ children, gallery }: Props): React.ReactElement => {
  const [redirect, setRedirect] = React.useState<string | undefined>(undefined);

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
    return <Navigate to={redirect} replace />;
  }
  return (
    <>
      <Helmet>
        <title>{gallery.title()}</title>
      </Helmet>
      <Root>
        <Link>
          <span className="title">
            <BsFillHouseFill />
            <i>Empty</i>
          </span>
        </Link>
      </Root>
      {children}
      <i>Empty</i>
    </>
  );
};
export default Empty;
