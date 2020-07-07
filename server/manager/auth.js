const CONST = require("../constants");

module.exports = (db) => {
  const authorizeView = (username, onSuccess, onError) => {
    db.loadUserAccessControl(
      username,
      (acl) => {
        const all = CONST.SPECIAL_GALLERY_ALL;
        if (all in acl && acl[all] >= CONST.ACCESS_VIEW) {
          onSuccess();
        } else {
          onError(CONST.ERROR_ACCESS);
        }
      },
      (error) => {
        if (username !== "guest") {
          authorizeView("guest", onSuccess, onError);
        } else {
          onError(error);
        }
      }
    );
  };
  const authorizeAdmin = (username, onSuccess, onError) => {
    db.loadUserAccessControl(
      username,
      (acl) => {
        const all = CONST.SPECIAL_GALLERY_ALL;
        if (all in acl && acl[all] >= CONST.ACCESS_ADMIN) {
          onSuccess();
        } else {
          onError(CONST.ERROR_ACCESS);
        }
      },
      (error) => {
        if (username !== "guest") {
          authorizeAdmin("guest", onSuccess, onError);
        } else {
          onError(error);
        }
      }
    );
  };
  const authorizeGalleryView = (username, galleryId, onSuccess, onError) => {
    db.loadUserAccessControl(
      username,
      (acl) => {
        if (galleryId in acl && acl[galleryId] >= CONST.ACCESS_VIEW) {
          onSuccess();
        } else {
          authorizeView(username, onSuccess, onError);
        }
      },
      (error) => {
        if (username !== "guest") {
          authorizeGalleryView("guest", galleryId, onSuccess, onError);
        } else {
          onError(error);
        }
      }
    );
  };
  const authorizeGalleryAdmin = (username, galleryId, onSuccess, onError) => {
    db.loadUserAccessControl(
      username,
      galleryId,
      (acl) => {
        if (galleryId in acl && acl[galleryId] >= CONST.ACCESS_ADMIN) {
          onSuccess();
        } else {
          authorizeAdmin(username, onSuccess, onError);
        }
      },
      (error) => {
        if (username !== "guest") {
          authorizeGalleryAdmin("guest", galleryId, onSuccess, onError);
        } else {
          onError(error);
        }
      }
    );
  };

  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};
