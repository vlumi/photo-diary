import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

const Lang = styled.span`
  margin: auto 0;
`;
const LangForm = styled.form``;
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

interface Props {
  lang: string;
}

const TopMenuLang = ({ lang }: Props): React.ReactElement => {
  const { i18n } = useTranslation();

  const handleLangChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    window.localStorage.setItem("lang", lang);
  };

  return (
    <Lang>
      <LangForm>
        <LangLabel $selected={lang === "en"}>
          <LangInput
            type="radio"
            value="en"
            checked={lang === "en"}
            onChange={handleLangChange}
          />
          English
        </LangLabel>
        |
        <LangLabel $selected={lang === "fi"}>
          <LangInput
            type="radio"
            value="fi"
            checked={lang === "fi"}
            onChange={handleLangChange}
          />
          Suomi
        </LangLabel>
        |
        <LangLabel $selected={lang === "ja"}>
          <LangInput
            type="radio"
            value="ja"
            checked={lang === "ja"}
            onChange={handleLangChange}
          />
          日本語
        </LangLabel>
      </LangForm>
    </Lang>
  );
};
export default TopMenuLang;
