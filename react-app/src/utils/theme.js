const setTheme = (theme) => {
  const oldClasses = document.body.classList || [];
  oldClasses.forEach((oldClass) => {
    if (oldClass.endsWith("-thee")) {
      document.body.classList.remove(oldClass);
    }
  });
  document.body.classList.add(`${theme}-theme`);
};

export default {
  setTheme,
};
