const loginUser = async (api, username) => {
  const authRes = await api
    .post("/api/tokens")
    .send({
      username: username,
      password: "foobar",
    })
    .expect(200);
  return authRes.body.token;
};

module.exports = {
  loginUser,
};
