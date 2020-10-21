const authorizer = require("../lib/authorizer.cjs")();
const model = require("../models/user.cjs")();

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
  await authorizer.authorizeAdmin(request.user.id);
  const cleanUser = (user) => {
    return {
      id: user.id,
    };
  };
  const users = await model.getUsers();
  response.json(users.map(cleanUser));
});
/**
 * Create a user.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const user = {};
  // TODO: validate and set content from request.body
  const createdUser = await model.createUser(user);
  response.json(createdUser);
});
/**
 * Get the matching user.
 */
router.get("/:userId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const user = await model.getUser(request.params.userId);
  response.json(user);
});
/**
 * Update the matching user.
 */
router.put("/:userId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.userId);
  const user = {};
  // TODO: validate and set content from request.body
  const updateduser = await model.updateUser(user);
  response.json(updateduser);
});
/**
 * Delete the matching user.
 */
router.delete("/:userId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  await model.deleteUser(request.params.userId);
  response.status(204).end();
});
