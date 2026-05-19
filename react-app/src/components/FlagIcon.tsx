import * as React from "react";
import ReactCountryFlag from "react-country-flag";

interface Props {
  code: string;
}

const FlagIcon = ({ code }: Props): React.ReactElement => {
  return <ReactCountryFlag countryCode={code} svg />;
};
export default FlagIcon;
