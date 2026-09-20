import { Type } from "typebox";

// A gallery grant as the API reads and writes it. The list routes
// answer in the shape the upsert routes accept, so what is PUT is what
// comes back: camelCase, real booleans, and `hideMap: null` for
// "inherit from the next outer level".

const grantFields = {
  galleryId: Type.String(),
  isEditor: Type.Boolean(),
  hideMap: Type.Union([Type.Boolean(), Type.Null()]),
  canSeePrivate: Type.Boolean(),
};

export const UserGrant = Type.Object({ userId: Type.String(), ...grantFields });
export const GroupGrant = Type.Object({ groupId: Type.String(), ...grantFields });

type GrantRow = {
  gallery_id: string;
  is_editor: number;
  hide_map: number | null;
  can_see_private: number;
};

export const grantFromRow = (row: GrantRow) => ({
  galleryId: row.gallery_id,
  isEditor: row.is_editor === 1,
  hideMap: row.hide_map === null ? null : row.hide_map === 1,
  canSeePrivate: row.can_see_private === 1,
});
