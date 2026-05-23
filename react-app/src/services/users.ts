import api, { unwrap } from "../lib/api";

const changePassword = async (
  currentPassword: string,
  newPassword: string
) =>
  unwrap(
    api.PUT("/api/v1/users/self/password", {
      body: { currentPassword, newPassword },
    })
  );

export default { changePassword };
