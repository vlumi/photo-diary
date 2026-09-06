import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import { useLangStore } from "../stores";

const Lang = styled.span`
  margin: auto 0;
`;
const LangForm = styled.form``;
const LangGroup = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
`;
// Visually hidden; still names the radio group for AT.
const LangLegend = styled.legend`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;
const LangLabel = styled("label", {
  shouldForwardProp: (prop) => prop !== "$selected",
})<{ $selected: boolean }>`
  margin: auto 5px;
  color: ${(props) =>
    props.$selected ? "var(--header-color)" : "var(--inactive-color)"};
`;
const LangInput = styled.input`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
`;

const TopMenuLang = (): React.ReactElement => {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  const handleLangChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLang(event.target.value);
  };

  return (
    <Lang>
      <LangForm>
        <LangGroup>
          <LangLegend>{t("lang-label")}</LangLegend>
          <LangLabel $selected={lang === "en"}>
            <LangInput
              type="radio"
              name="lang"
              value="en"
              checked={lang === "en"}
              onChange={handleLangChange}
            />
            English
          </LangLabel>
          <span aria-hidden="true">|</span>
          <LangLabel $selected={lang === "fi"}>
            <LangInput
              type="radio"
              name="lang"
              value="fi"
              checked={lang === "fi"}
              onChange={handleLangChange}
            />
            Suomi
          </LangLabel>
          <span aria-hidden="true">|</span>
          <LangLabel $selected={lang === "ja"}>
            <LangInput
              type="radio"
              name="lang"
              value="ja"
              checked={lang === "ja"}
              onChange={handleLangChange}
            />
            日本語
          </LangLabel>
        </LangGroup>
      </LangForm>
    </Lang>
  );
};
export default TopMenuLang;
