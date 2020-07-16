const authorizer = require("../utils/authorizer")();
const model = require("../models/user")();

const init = async () => {
  await model.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

/**
 * Get all users.
 */
router.get("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const cleanUser = (user) => {
    return {
      username: user.username,
    };
  };
  const users = await model.getUsers();
  response.json(users.map(cleanUser));
});
/**
 * Create a user.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const user = {};
  // TODO: validate and set content from request.body
  const createdUser = await model.createUser(user);
  response.json(createdUser);
});
/**
 * Get the matching user.
 */
router.get("/:username", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const user = await model.getUser(request.params.username);
  response.json(user);
});
/**
 * Update the matching user.
 */
router.put("/:username", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const user = {};
  // TODO: validate and set content from request.body
  const updateduser = await model.updateUser(user);
  response.json(updateduser);
});
/**
 * Delete the matching user.
 */
router.delete("/:username", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  await model.deleteUser(request.params.username);
  response.status(204).end();
});
