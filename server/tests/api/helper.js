const loginUser = async (api, id) => {
  const authRes = await api
    .post("/api/v1/tokens")
    .send({
      id: id,
      password: "foobar",
    })
    .expect(200);
  return authRes.body.token;
};

module.exports = {
  loginUser,
};
