export const isLeap = (year: number | undefined): boolean | undefined =>
  year ? !(year & 3 || (!(year % 25) && year & 15)) : undefined;
