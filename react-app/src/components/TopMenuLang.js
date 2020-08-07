import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const Lang = styled.span`
  margin: auto 0;
`;
const LangForm = styled.form``;
const LangLabel = styled.label`
  margin: auto 5px;
  color: ${(props) =>
    props.selected ? "var(--header-color)" : "var(--inactive-color)"};
`;
const LangInput = styled.input`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
`;

const TopMenuLang = ({ lang }) => {
  const { i18n } = useTranslation();

  const handleLangChange = (event) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    window.localStorage.setItem("lang", lang);
  };

  return (
    <Lang>
      <LangForm>
        <LangLabel selected={lang === "en"}>
          <LangInput
            type="radio"
            value="en"
            checked={lang === "en"}
            onChange={handleLangChange}
          />
          English
        </LangLabel>
        |
        <LangLabel selected={lang === "fi"}>
          <LangInput
            type="radio"
            value="fi"
            checked={lang === "fi"}
            onChange={handleLangChange}
          />
          Suomi
        </LangLabel>
        |
        <LangLabel selected={lang === "ja"}>
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
TopMenuLang.propTypes = {
  lang: PropTypes.string.isRequired,
};
export default TopMenuLang;
