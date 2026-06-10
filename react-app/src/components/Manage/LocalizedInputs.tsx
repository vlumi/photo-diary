import React from "react";
import styled from "@emotion/styled";

// Supported UI languages — mirrors `react-app/src/lib/i18n.ts`'s
// resource set. Each operator-set field renders one input row per
// language under its canonical input. Server stores empty strings as
// NULL (clears the overlay), so leaving a row blank is the natural way
// to "no translation here".
export const SUPPORTED_LANGS = ["en", "fi", "ja"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 12px;
  margin-top: 4px;
  border-left: 2px solid var(--inactive-color);
`;
const Row = styled.div`
  display: flex;
  align-items: stretch;
  gap: 6px;
`;
const LangLabel = styled.span`
  flex: 0 0 auto;
  font-size: 0.7em;
  color: var(--inactive-color);
  align-self: center;
  width: 22px;
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
const Input = styled.input`
  font: inherit;
  padding: 4px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.9em;
`;
const TextArea = styled.textarea`
  font: inherit;
  padding: 4px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  min-height: 50px;
  box-sizing: border-box;
  font-size: 0.9em;
  resize: vertical;
`;

interface Props {
  value: Record<string, string>;
  onChange: (lang: string, value: string) => void;
  multiline?: boolean;
  langs?: readonly string[];
  // Mark one language as the canonical primary — its overlay row is
  // skipped (the canonical column carries that value). Defaults to
  // showing every supported language.
  primary?: string | null;
}

const LocalizedInputs = ({
  value,
  onChange,
  multiline = false,
  langs = SUPPORTED_LANGS,
  primary,
}: Props): React.ReactElement => {
  const rendered = primary ? langs.filter((l) => l !== primary) : langs;
  return (
    <Stack>
      {rendered.map((lang) => (
        <Row key={lang}>
          <LangLabel>{lang}</LangLabel>
          {multiline ? (
            <TextArea
              value={value[lang] ?? ""}
              onChange={(e) => onChange(lang, e.target.value)}
            />
          ) : (
            <Input
              type="text"
              value={value[lang] ?? ""}
              onChange={(e) => onChange(lang, e.target.value)}
            />
          )}
        </Row>
      ))}
    </Stack>
  );
};

export default LocalizedInputs;
