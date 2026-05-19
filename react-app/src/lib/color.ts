import format from "./format";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const isValidChannel = (channel: number): boolean =>
  Number.isInteger(channel) && channel >= 0 && channel <= 255;

const toHexRgb = ({ r, g, b }: Rgb): string => {
  if (!isValidChannel(r) || !isValidChannel(g) || !isValidChannel(b)) {
    return "#000000";
  }
  return (
    "#" +
    format.padNumber(r.toString(16), 2) +
    format.padNumber(g.toString(16), 2) +
    format.padNumber(b.toString(16), 2)
  );
};

const fromHexRgb = (hex: string): [number, number, number] => {
  if (!hex || !hex.startsWith("#")) {
    return [0, 0, 0];
  }
  const rawValue = parseInt(hex.substring(1), 16);
  switch (hex.length) {
    case 4:
      return [
        (((rawValue >> 8) & 0xf) << 4) + ((rawValue >> 8) & 0xf),
        (((rawValue >> 4) & 0xf) << 4) + ((rawValue >> 4) & 0xf),
        ((rawValue & 0xf) << 4) + (rawValue & 0xf),
      ];
    case 7:
      return [(rawValue >> 16) & 0xff, (rawValue >> 8) & 0xff, rawValue & 0xff];
    default:
      return [0, 0, 0];
  }
};

const colorGradient = (
  start: string,
  end: string,
  steps: number
): string[] => {
  if (steps < 1 || !start || !end) return [];
  if (steps < 2) return [start];
  if (steps < 3) return [start, end];

  const [r1, g1, b1] = fromHexRgb(start);
  const [r2, g2, b2] = fromHexRgb(end);

  const linearStep = (
    start: number,
    end: number,
    step: number,
    lastStep: number
  ): number =>
    end > start
      ? Math.round(start + ((end - start) * step) / lastStep)
      : Math.round(start - ((start - end) * step) / lastStep);

  return [...Array(steps).keys()]
    .map((step) => {
      return {
        r: linearStep(r1, r2, step, steps - 1),
        g: linearStep(g1, g2, step, steps - 1),
        b: linearStep(b1, b2, step, steps - 1),
      };
    })
    .map(toHexRgb);
};

export default { toHexRgb, fromHexRgb, colorGradient };
