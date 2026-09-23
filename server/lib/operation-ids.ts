// The name of every operation, as generated clients call it (the iOS
// companion's method names come from here). Part of the contract: a
// rename breaks client code the way a renamed field breaks decoding.
// `tests/api/openapi.test.ts` refuses a route missing from this table.
export const OPERATION_IDS: Record<string, string> = {
  "GET /api/v1/meta": "getMeta",
  "POST /api/v1/meta": "createMetaEntry",
  "GET /api/v1/meta/{key}": "getMetaEntry",
  "PUT /api/v1/meta/{key}": "setMetaEntry",
  "DELETE /api/v1/meta/{key}": "deleteMetaEntry",

  "GET /api/v1/tokens": "getSession",
  "POST /api/v1/tokens": "logIn",
  "DELETE /api/v1/tokens": "logOut",
  "POST /api/v1/tokens/refresh": "refreshSession",
  "DELETE /api/v1/tokens/{userId}": "revokeUserSessions",
  "POST /api/v1/tokens/cross-host": "createCrossHostTicket",
  "POST /api/v1/tokens/pairing": "createPairingTicket",
  "GET /api/v1/tokens/sso": "consumeTicket",

  "GET /api/v1/users": "listUsers",
  "POST /api/v1/users": "createUser",
  "GET /api/v1/users/{userId}": "getUser",
  "PUT /api/v1/users/{userId}": "updateUser",
  "DELETE /api/v1/users/{userId}": "deleteUser",
  "PUT /api/v1/users/self/password": "changeOwnPassword",

  "GET /api/v1/galleries": "listGalleries",
  "POST /api/v1/galleries": "createGallery",
  "POST /api/v1/galleries/_order": "reorderGalleries",
  "GET /api/v1/galleries/{galleryId}": "getGallery",
  "PUT /api/v1/galleries/{galleryId}": "updateGallery",
  "DELETE /api/v1/galleries/{galleryId}": "deleteGallery",
  "PUT /api/v1/galleries/{galleryId}/icon": "setGalleryIcon",
  "GET /api/v1/galleries/{galleryId}/filters": "listSavedFilters",
  "POST /api/v1/galleries/{galleryId}/filters": "createSavedFilter",
  "GET /api/v1/galleries/{galleryId}/filters/{filterId}": "getSavedFilter",
  "PUT /api/v1/galleries/{galleryId}/filters/{filterId}": "updateSavedFilter",
  "DELETE /api/v1/galleries/{galleryId}/filters/{filterId}": "deleteSavedFilter",
  "POST /api/v1/galleries/{galleryId}/stats": "getGalleryStats",
  "POST /api/v1/galleries/{galleryId}/stats/evolution": "getGalleryStatsEvolution",

  "GET /api/v1/photos": "listCatalogPhotos",
  "POST /api/v1/photos": "createPhoto",
  "GET /api/v1/photos/audit-counts": "getPhotoAuditCounts",
  "GET /api/v1/photos/year-months": "getPhotoYearMonths",
  "POST /api/v1/photos/by-ids": "getPhotosByIds",
  "POST /api/v1/photos/query": "queryCatalogPhotos",
  "GET /api/v1/photos/{photoId}": "getCatalogPhoto",
  "PUT /api/v1/photos/{photoId}": "updatePhoto",
  "DELETE /api/v1/photos/{photoId}": "deletePhoto",
  "POST /api/v1/photos/{photoId}/regeocode": "regeocodePhoto",

  "GET /api/v1/gallery-photos/{galleryId}": "listGalleryPhotos",
  "POST /api/v1/gallery-photos/{galleryId}/query": "queryGalleryPhotos",
  "POST /api/v1/gallery-photos/{galleryId}/counts": "countGalleryPhotosByDay",
  "POST /api/v1/gallery-photos/{galleryId}/neighbors": "getGalleryPhotoNeighbors",
  "POST /api/v1/gallery-photos/{galleryId}/filter-values": "getGalleryFilterValues",
  "GET /api/v1/gallery-photos/{galleryId}/by-original-filename/{originalFilename}":
    "getGalleryPhotoByOriginalFilename",
  "GET /api/v1/gallery-photos/{galleryId}/{photoId}": "getGalleryPhoto",
  "PUT /api/v1/gallery-photos/{galleryId}/{photoId}": "linkPhotoToGallery",
  "DELETE /api/v1/gallery-photos/{galleryId}/{photoId}": "unlinkPhotoFromGallery",

  "GET /api/v1/user-gallery": "listUserGrants",
  "PUT /api/v1/user-gallery/{userId}/{galleryId}": "setUserGrant",
  "DELETE /api/v1/user-gallery/{userId}/{galleryId}": "deleteUserGrant",

  "GET /api/v1/groups": "listGroups",
  "POST /api/v1/groups": "createGroup",
  "GET /api/v1/groups/{groupId}": "getGroup",
  "PUT /api/v1/groups/{groupId}": "updateGroup",
  "DELETE /api/v1/groups/{groupId}": "deleteGroup",
  "GET /api/v1/groups/{groupId}/members": "listGroupMembers",
  "PUT /api/v1/groups/{groupId}/members/{userId}": "addGroupMember",
  "DELETE /api/v1/groups/{groupId}/members/{userId}": "removeGroupMember",

  "GET /api/v1/group-gallery": "listGroupGrants",
  "PUT /api/v1/group-gallery/{groupId}/{galleryId}": "setGroupGrant",
  "DELETE /api/v1/group-gallery/{groupId}/{galleryId}": "deleteGroupGrant",

  "POST /api/v1/stats": "getCatalogStats",
  "POST /api/v1/stats/evolution": "getCatalogStatsEvolution",
  "POST /api/v1/filter-values": "getCatalogFilterValues",
  "GET /api/v1/operations": "listOperations",
};

/** The route's name, looked up by its OpenAPI path (`:id` → `{id}`). */
export const operationIdFor = (method: string, url: string): string | undefined =>
  OPERATION_IDS[`${method.toUpperCase()} ${url.replace(/:(\w+)/g, "{$1}")}`];
