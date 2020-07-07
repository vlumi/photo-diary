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
        if (Array.isArray(galleryId)) {
          const all = CONST.SPECIAL_GALLERY_ALL;
          const authorizedGalleries = galleryId.filter((id) => {
            if (id in acl) {
              return acl[id] >= CONST.ACCESS_VIEW;
            } else if (all in acl) {
              return acl[all] >= CONST.ACCESS_VIEW;
            }
            return false;
          });
          onSuccess(authorizedGalleries);
        } else if (galleryId in acl) {
          if (acl[galleryId] >= CONST.ACCESS_VIEW) {
            onSuccess([galleryId]);
          } else {
            onError(CONST.ERROR_ACCESS);
          }
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
        if (Array.isArray(galleryId)) {
          const all = CONST.SPECIAL_GALLERY_ALL;
          const authorizedGalleries = galleryId.filter((id) => {
            if (id in acl) {
              return acl[id] >= CONST.ACCESS_ADMIN;
            } else if (all in acl) {
              return acl[all] >= CONST.ACCESS_ADMIN;
            }
            return false;
          });
          onSuccess(authorizedGalleries);
        } else if (galleryId in acl) {
          if (acl[galleryId] >= CONST.ACCESS_ADMIN) {
            onSuccess([gallery]);
          } else {
            onError(CONST.ERROR_ACCESS);
          }
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
