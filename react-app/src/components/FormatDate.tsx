import format from "../lib/format";

interface Props {
  year?: number;
  month?: number;
  day?: number;
}

const FormatDate = ({ year, month, day }: Props): string =>
  format.date({ year, month, day, separator: "-" });

export default FormatDate;
