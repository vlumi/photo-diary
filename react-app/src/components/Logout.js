import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import TopMenuButton from "./TopMenuButton";

import token from "../lib/token";

const Form = styled.form``;

const Logout = ({ setUser }) => {
  const { t } = useTranslation();

  const handleLogout = (event) => {
    event.preventDefault();
    window.localStorage.clear();
    setUser(undefined);
    token.clearToken();
  };

  return (
    <Form onSubmit={handleLogout}>
      <TopMenuButton type="submit">{t("logout")}</TopMenuButton>
    </Form>
  );
};
Logout.propTypes = {
  setUser: PropTypes.func.isRequired,
};
export default Logout;
