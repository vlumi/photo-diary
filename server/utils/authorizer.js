const CONST = require("./constants");
const db = require("../db");

module.exports = () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

const authorizeView = (username) => {
  return new Promise((resolve, reject) => {
    db.loadUserAccessControl(username)
      .then((acl) => {
        const all = CONST.SPECIAL_GALLERY_ALL;
        if (all in acl && acl[all] >= CONST.ACCESS_VIEW) {
          resolve();
        } else {
          reject(CONST.ERROR_ACCESS);
        }
      })
      .catch((error) => {
        if (username !== "guest") {
          authorizeView("guest")
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          reject(error);
        }
      });
  });
};
const authorizeAdmin = (username) => {
  return new Promise((resolve, reject) => {
    db.loadUserAccessControl(username)
      .then((acl) => {
        const all = CONST.SPECIAL_GALLERY_ALL;
        if (all in acl && acl[all] >= CONST.ACCESS_ADMIN) {
          resolve();
        } else {
          reject(CONST.ERROR_ACCESS);
        }
      })
      .catch((error) => {
        if (username !== "guest") {
          authorizeAdmin("guest")
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          reject(error);
        }
      });
  });
};
const authorizeGalleryView = (username, galleryId) => {
  return new Promise((resolve, reject) => {
    db.loadUserAccessControl(username)
      .then((acl) => {
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
          resolve(authorizedGalleries);
        } else if (galleryId in acl) {
          if (acl[galleryId] >= CONST.ACCESS_VIEW) {
            resolve([galleryId]);
          } else {
            reject(CONST.ERROR_ACCESS);
          }
        } else {
          authorizeView(username)
            .then(() => resolve())
            .catch((error) => reject(error));
        }
      })
      .catch((error) => {
        if (username !== "guest") {
          authorizeGalleryView("guest", galleryId)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          reject(error);
        }
      });
  });
};
const authorizeGalleryAdmin = (username, galleryId) => {
  return new Promise((resolve, reject) => {
    db.loadUserAccessControl(username)
      .then(galleryId, (acl) => {
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
          resolve(authorizedGalleries);
        } else if (galleryId in acl) {
          if (acl[galleryId] >= CONST.ACCESS_ADMIN) {
            resolve([galleryId]);
          } else {
            reject(CONST.ERROR_ACCESS);
          }
        } else {
          authorizeAdmin(username)
            .then(() => resolve())
            .catch((error) => reject(error));
        }
      })
      .catch((error) => {
        if (username !== "guest") {
          authorizeGalleryAdmin("guest", galleryId)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          reject(error);
        }
      });
  });
};
