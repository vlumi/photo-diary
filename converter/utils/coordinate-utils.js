const convertToDecimal = (degrees, minutes, seconds, negative) => {
  return (negative ? -1 : 1) * (degrees + minutes / 60 + seconds / 3600);
};
const latitudeToDecimal = (degrees, minutes, seconds, hemisphere) => {
  if (["N", "S"].indexOf(hemisphere) < 0) {
    throw `Invalid latitude hemisphere value: ${hemisphere}`;
  }
  if (degrees < 0 || degrees > 90) {
    throw `Latitude degrees outside of range: ${degrees}`;
  }
  if (minutes < 0 || minutes >= 60) {
    throw `Latitude minutes outside of range: ${minutes}`;
  }
  if (seconds < 0 || seconds >= 60) {
    throw `Latitude minutes outside of range: ${minutes}`;
  }
  if (degrees === 90 && (minutes > 0 || seconds > 0)) {
    throw `Latitude exceeds 180 degrees: ${degrees}° ${minutes}′ ${seconds}″ ${hemisphere}`;
  }
  return convertToDecimal(degrees, minutes, seconds, hemisphere === "S");
};
const longitudeToDecimal = (degrees, minutes, seconds, hemisphere) => {
  if (["E", "W"].indexOf(hemisphere) < 0) {
    throw `Invalid longitude hemisphere value: ${hemisphere}`;
  }
  if (degrees < 0 || degrees > 180) {
    throw `Longitude degrees outside of range: ${degrees}`;
  }
  if (minutes < 0 || minutes >= 60) {
    throw `Longitude minutes outside of range: ${minutes}`;
  }
  if (seconds < 0 || seconds >= 60) {
    throw `Longitude seconds outside of range: ${seconds}`;
  }
  if (degrees === 180 && (minutes > 0 || seconds > 0)) {
    throw `Longitude exceeds 180 degrees: ${degrees}° ${minutes}′ ${seconds}″ ${hemisphere}`;
  }
  return convertToDecimal(degrees, minutes, seconds, hemisphere === "W");
};

module.exports = {
  latitudeToDecimal,
  longitudeToDecimal,
};
