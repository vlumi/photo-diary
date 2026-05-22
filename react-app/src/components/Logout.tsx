import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import TopMenuButton from "./TopMenuButton";

import token from "../lib/token";
import { useUserStore } from "../stores";

const Form = styled.form``;

const Logout = (): React.ReactElement => {
  const { t } = useTranslation();
  const setUser = useUserStore((s) => s.setUser);

  const handleLogout = (event: React.FormEvent) => {
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
export default Logout;
