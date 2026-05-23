import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import TopMenuButton from "./TopMenuButton";

import token from "../lib/token";
import { useUserStore } from "../stores";

const Form = styled.form``;

const Logout = (): React.ReactElement => {
  const { t } = useTranslation();
  const setUser = useUserStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const handleLogout = (event: React.FormEvent) => {
    event.preventDefault();
    // Ordering matters: clear the bearer token *before* `setUser`, otherwise
    // the React re-render fires the new (guest-keyed) queries while the old
    // token is still attached, and the server replies as if the user were
    // still authenticated. The cached response then sticks under the new
    // key until something invalidates it.
    token.clearToken();
    // Only the `user` key is auth state — preserve `lang` and any other
    // unrelated prefs that happen to share `localStorage`.
    window.localStorage.removeItem("user");
    setUser(undefined);
    // Invalidate the access-derived caches so the immediate re-render
    // fetches the new (guest) view instead of reusing the
    // previous-user data cached under the old query key.
    queryClient.invalidateQueries({ queryKey: ["galleries"] });
    queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
  };

  return (
    <Form onSubmit={handleLogout}>
      <TopMenuButton type="submit">{t("logout")}</TopMenuButton>
    </Form>
  );
};
export default Logout;
