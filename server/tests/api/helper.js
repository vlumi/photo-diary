const parseCookie = (cookie) => cookie.split(";", 2)[0].split("=");
const parseCookies = (cookies) =>
  cookies.reduce((result, cookie) => {
    const [key, value] = parseCookie(cookie);
    return {
      ...result,
      [key]: value,
    };
  }, {});

const loginUser = async (api, username) => {
  const authRes = await api
    .post("/api/sessions")
    .send({
      username: username,
      password: "foobar",
    })
    .expect(204);
  const cookies = parseCookies(authRes.headers["set-cookie"]);
  return cookies.token;
};

module.exports = {
  parseCookies,
  loginUser,
};
