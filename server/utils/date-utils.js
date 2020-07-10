const isLeap = (year) =>
  year ? !(year & 3 || (!(year % 25) && year & 15)) : undefined;

module.exports = {
  isLeap,
};
