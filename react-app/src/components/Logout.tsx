import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import TopMenuButton from "./TopMenuButton";

import token from "../lib/token";
import type { User } from "../models/UserModel";

const Form = styled.form``;

interface Props {
  setUser: (user: User | undefined) => void;
}

const Logout = ({ setUser }: Props): React.ReactElement => {
  const { t } = useTranslation();

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
