const schema = require("../../../db/sqlite3/schema")();

describe("User", () => {
  const cols = ["id", "password", "secret"].join(",");
  test("Build create query", () =>
    expect(schema.user.buildCreateQuery()).toBe(
      `INSERT INTO user (${cols}) VALUES (?,?,?)`
    ));
  test("Build select by id query", () =>
    expect(schema.user.buildSelectByIdQuery()).toBe(
      "SELECT id,password,secret FROM user WHERE id = ? ORDER BY id ASC"
    ));
  test("Build update by id query: nothing", () =>
    expect(schema.user.buildUpdateByIdQuery({})).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: id", () =>
    expect(schema.user.buildUpdateByIdQuery({ id: "foo" })).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: password", () =>
    expect(schema.user.buildUpdateByIdQuery({ password: "foo" })).toStrictEqual(
      {
        query: "UPDATE user SET password=? WHERE id = ?",
        values: ["foo"],
      }
    ));
  test("Build update by id query: password, secret", () =>
    expect(
      schema.user.buildUpdateByIdQuery({
        password: "foo",
        secret: "bar",
      })
    ).toStrictEqual({
      query: "UPDATE user SET password=?, secret=? WHERE id = ?",
      values: ["foo", "bar"],
    }));
  test("Build update by id query: all", () =>
    expect(
      schema.user.buildUpdateByIdQuery({
        id: "newId",
        password: "foo",
        secret: "bar",
      })
    ).toStrictEqual({
      query: "UPDATE user SET password=?, secret=? WHERE id = ?",
      values: ["foo", "bar"],
    }));
  test("Build delete by id query", () =>
    expect(schema.user.buildDeleteByIdQuery()).toBe(
      "DELETE FROM user WHERE id = ?"
    ));
  test("Build select all query", () =>
    expect(schema.user.buildSelectQuery()).toBe(
      "SELECT id,password,secret FROM user ORDER BY id ASC"
    ));
  test("Build select by condition query", () =>
    expect(schema.user.buildSelectQuery(["id = ?"])).toBe(
      "SELECT id,password,secret FROM user WHERE id = ? ORDER BY id ASC"
    ));
  test("Build delete all query", () =>
    expect(schema.user.buildDeleteQuery()).toBe("DELETE FROM user"));
  test("Build delete by condition query", () =>
    expect(schema.user.buildDeleteQuery(["id = ?"])).toBe(
      "DELETE FROM user WHERE id = ?"
    ));
});

describe("ACL", () => {
  const cols = ["user_id", "gallery_id", "level"].join(",");
  test("Build create query", () =>
    expect(schema.acl.buildCreateQuery()).toBe(
      `INSERT INTO acl (${cols}) VALUES (?,?,?)`
    ));
  test("Build select by id query", () =>
    expect(schema.acl.buildSelectByIdQuery()).toBe(
      `SELECT ${cols} FROM acl WHERE user_id = ? AND gallery_id = ? ORDER BY user_id ASC,gallery_id ASC`
    ));
  test("Build update by id query: nothing", () =>
    expect(schema.acl.buildUpdateByIdQuery({})).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: user_id", () =>
    expect(schema.acl.buildUpdateByIdQuery({ user_id: "foo" })).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: gallery_id", () =>
    expect(
      schema.acl.buildUpdateByIdQuery({ gallery_id: "foo" })
    ).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: user_id, gallery_id", () =>
    expect(
      schema.acl.buildUpdateByIdQuery({ user_id: "foo", gallery_id: "bar" })
    ).toStrictEqual({ query: undefined, values: undefined }));
  test("Build update by id query: level", () =>
    expect(schema.acl.buildUpdateByIdQuery({ level: 2 })).toStrictEqual({
      query: "UPDATE acl SET level=? WHERE user_id = ? AND gallery_id = ?",
      values: [2],
    }));
  test("Build update by id query: all", () =>
    expect(
      schema.acl.buildUpdateByIdQuery({
        user_id: "foo",
        gallery_id: "bar",
        level: 2,
      })
    ).toStrictEqual({
      query: "UPDATE acl SET level=? WHERE user_id = ? AND gallery_id = ?",
      values: [2],
    }));
  test("Build delete by id query", () =>
    expect(schema.acl.buildDeleteByIdQuery()).toBe(
      "DELETE FROM acl WHERE user_id = ? AND gallery_id = ?"
    ));
  test("Build select all query", () =>
    expect(schema.acl.buildSelectQuery()).toBe(
      `SELECT ${cols} FROM acl ORDER BY user_id ASC,gallery_id ASC`
    ));
  test("Build select by condition query", () =>
    expect(schema.acl.buildSelectQuery(["id = ?"])).toBe(
      `SELECT ${cols} FROM acl WHERE id = ? ORDER BY user_id ASC,gallery_id ASC`
    ));
  test("Build delete all query", () =>
    expect(schema.acl.buildDeleteQuery()).toBe("DELETE FROM acl"));
  test("Build delete by condition query", () =>
    expect(schema.acl.buildDeleteQuery(["id = ?"])).toBe(
      "DELETE FROM acl WHERE id = ?"
    ));
});

describe("Gallery", () => {
  const cols = [
    "id",
    "title",
    "description",
    "icon",
    "epoch",
    "epoch_type",
    "theme",
    "initial_view",
    "hostname",
  ].join(",");
  test("Build create query", () =>
    expect(schema.gallery.buildCreateQuery()).toBe(
      `INSERT INTO gallery (${cols}) VALUES (?,?,?,?,?,?,?,?,?)`
    ));
  test("Build select by id query", () =>
    expect(schema.gallery.buildSelectByIdQuery()).toBe(
      `SELECT ${cols} FROM gallery WHERE id = ? ORDER BY id ASC`
    ));
  test("Build update by id query: nothing", () =>
    expect(schema.gallery.buildUpdateByIdQuery({})).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: id", () =>
    expect(schema.gallery.buildUpdateByIdQuery({ id: "foo" })).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: title", () =>
    expect(schema.gallery.buildUpdateByIdQuery({ title: "foo" })).toStrictEqual(
      {
        query: "UPDATE gallery SET title=? WHERE id = ?",
        values: ["foo"],
      }
    ));
  test("Build update by id query: title, description", () =>
    expect(
      schema.gallery.buildUpdateByIdQuery({
        title: "foo",
        description: "new description",
      })
    ).toStrictEqual({
      query: "UPDATE gallery SET title=?, description=? WHERE id = ?",
      values: ["foo", "new description"],
    }));
  test("Build update by id query: all", () =>
    expect(
      schema.gallery.buildUpdateByIdQuery({
        id: "new id",
        title: "new title",
        description: "new description",
        icon: "new icon",
        epoch: "new epoch",
        epochType: "new epoch type",
        theme: "new theme",
        initialView: "new initial view",
        hostname: "new hostname",
      })
    ).toStrictEqual({
      query:
        "UPDATE gallery SET title=?, description=?, icon=?, epoch=?, epoch_type=?, theme=?, initial_view=?, hostname=? WHERE id = ?",
      values: [
        "new title",
        "new description",
        "new icon",
        "new epoch",
        "new epoch type",
        "new theme",
        "new initial view",
        "new hostname",
      ],
    }));
  test("Build delete by id query", () =>
    expect(schema.gallery.buildDeleteByIdQuery()).toBe(
      "DELETE FROM gallery WHERE id = ?"
    ));
  test("Build select all query", () =>
    expect(schema.gallery.buildSelectQuery()).toBe(
      `SELECT ${cols} FROM gallery ORDER BY id ASC`
    ));
  test("Build select by condition query", () =>
    expect(schema.gallery.buildSelectQuery(["id = ?"])).toBe(
      `SELECT ${cols} FROM gallery WHERE id = ? ORDER BY id ASC`
    ));
  test("Build delete all query", () =>
    expect(schema.gallery.buildDeleteQuery()).toBe("DELETE FROM gallery"));
  test("Build delete by condition query", () =>
    expect(schema.gallery.buildDeleteQuery(["id = ?"])).toBe(
      "DELETE FROM gallery WHERE id = ?"
    ));
});

describe("Gallery Photo", () => {
  const cols = ["gallery_id", "photo_id"].join(",");
  test("Build create query", () =>
    expect(schema.galleryPhoto.buildCreateQuery()).toBe(
      `INSERT INTO gallery_photo (${cols}) VALUES (?,?)`
    ));
  test("Build select by id query", () =>
    expect(schema.galleryPhoto.buildSelectByIdQuery()).toBe(
      `SELECT ${cols} FROM gallery_photo WHERE gallery_id = ? AND photo_id = ? ORDER BY gallery_id ASC,photo_id ASC`
    ));
  // TODO: update
  test("Build update by id query: nothing", () =>
    expect(schema.galleryPhoto.buildUpdateByIdQuery({})).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: gallery_id", () =>
    expect(
      schema.galleryPhoto.buildUpdateByIdQuery({ gallery_id: "foo" })
    ).toStrictEqual({ query: undefined, values: undefined }));
  test("Build update by id query: photo_id", () =>
    expect(
      schema.galleryPhoto.buildUpdateByIdQuery({ photo_id: "foo" })
    ).toStrictEqual({ query: undefined, values: undefined }));
  test("Build update by id query: gallery_id, photo_id", () =>
    expect(
      schema.galleryPhoto.buildUpdateByIdQuery({
        gallery_id: "foo",
        photo_id: "bar",
      })
    ).toStrictEqual({ query: undefined, values: undefined }));
  test("Build delete by id query", () =>
    expect(schema.galleryPhoto.buildDeleteByIdQuery()).toBe(
      "DELETE FROM gallery_photo WHERE gallery_id = ? AND photo_id = ?"
    ));
  test("Build select all query", () =>
    expect(schema.galleryPhoto.buildSelectQuery()).toBe(
      `SELECT ${cols} FROM gallery_photo ORDER BY gallery_id ASC,photo_id ASC`
    ));
  test("Build select by condition query", () =>
    expect(schema.galleryPhoto.buildSelectQuery(["id = ?"])).toBe(
      `SELECT ${cols} FROM gallery_photo WHERE id = ? ORDER BY gallery_id ASC,photo_id ASC`
    ));
  test("Build delete all query", () =>
    expect(schema.galleryPhoto.buildDeleteQuery()).toBe(
      "DELETE FROM gallery_photo"
    ));
  test("Build delete by condition query", () =>
    expect(schema.galleryPhoto.buildDeleteQuery(["id = ?"])).toBe(
      "DELETE FROM gallery_photo WHERE id = ?"
    ));
});

describe("Photo", () => {
  const cols = [
    "id",
    "title",
    "description",
    "author",

    "taken",
    "country_code",
    "place",
    "coord_lat",
    "coord_lon",
    "coord_alt",

    "camera_make",
    "camera_model",
    "camera_serial",
    "lens_make",
    "lens_model",
    "lens_serial",

    "focal",
    "fstop",
    "exposure_time",
    "iso",

    "orig_width",
    "orig_height",
    "disp_width",
    "disp_height",
    "thumb_width",
    "thumb_height",
  ].join(",");
  test("Build create query", () =>
    expect(schema.photo.buildCreateQuery()).toBe(
      `INSERT INTO photo (${cols}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ));
  test("Build select by id query", () =>
    expect(schema.photo.buildSelectByIdQuery()).toBe(
      `SELECT ${cols} FROM photo WHERE id = ? ORDER BY taken ASC,id ASC`
    ));
  // TODO: update
  test("Build update by id query: nothing", () =>
    expect(schema.photo.buildUpdateByIdQuery({})).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: id", () =>
    expect(schema.photo.buildUpdateByIdQuery({ id: "foo" })).toStrictEqual({
      query: undefined,
      values: undefined,
    }));
  test("Build update by id query: title", () =>
    expect(schema.photo.buildUpdateByIdQuery({ title: "foo" })).toStrictEqual({
      query: "UPDATE photo SET title=? WHERE id = ?",
      values: ["foo"],
    }));
  test("Build update by id query: title, description", () =>
    expect(
      schema.photo.buildUpdateByIdQuery({
        title: "foo",
        description: "new description",
      })
    ).toStrictEqual({
      query: "UPDATE photo SET title=?, description=? WHERE id = ?",
      values: ["foo", "new description"],
    }));
  test("Build update by id query: all", () =>
    expect(
      schema.photo.buildUpdateByIdQuery({
        id: "new id",
        index: 123,
        title: "new title",
        description: "new description",
        taken: {
          instant: {
            timestamp: "2020-10-13 12:34:56",
            year: 2020,
            month: 10,
            day: 13,
            hour: 12,
            minute: 34,
            second: 56,
          },
          author: "new author",
          location: {
            country: "jp",
            place: "new place",
            coordinates: {
              latitude: 1.0,
              longitude: -1.0,
              altitude: 100,
            },
          },
        },
        camera: {
          make: "new camera_make",
          model: "new camera_model",
          serial: "new camera_serial",
        },
        lens: {
          make: "new lens_make",
          model: "new lens_model",
          serial: "new lens_serial",
        },
        exposure: {
          focalLength: 50,
          aperture: 1.0,
          exposureTime: 0.1,
          iso: 100,
        },
        dimensions: {
          original: {
            width: 1,
            height: 2,
          },
          display: {
            width: 3,
            height: 4,
          },
          thumbnail: {
            width: 5,
            height: 6,
          },
        },
      })
    ).toStrictEqual({
      query:
        "UPDATE photo SET" +
        " title=?, description=?, author=?," +
        " taken=?, country_code=?, place=?, coord_lat=?, coord_lon=?, coord_alt=?," +
        " camera_make=?, camera_model=?, camera_serial=?, lens_make=?, lens_model=?, lens_serial=?," +
        " focal=?, fstop=?, exposure_time=?, iso=?," +
        " orig_width=?, orig_height=?, disp_width=?, disp_height=?, thumb_width=?, thumb_height=?" +
        " WHERE id = ?",
      values: [
        "new title",
        "new description",
        "new author",

        "2020-10-13 12:34:56",
        "jp",
        "new place",
        1.0,
        -1.0,
        100,

        "new camera_make",
        "new camera_model",
        "new camera_serial",
        "new lens_make",
        "new lens_model",
        "new lens_serial",

        50,
        1.0,
        0.1,
        100,

        1,
        2,
        3,
        4,
        5,
        6,
      ],
    }));
  test("Build update by id query: all empty", () =>
    expect(
      schema.photo.buildUpdateByIdQuery({
        id: undefined,
        index: undefined,
        title: undefined,
        description: undefined,
        taken: {
          instant: {
            timestamp: undefined,
            year: undefined,
            month: undefined,
            day: undefined,
            hour: undefined,
            minute: undefined,
            second: undefined,
          },
          author: undefined,
          location: {
            country: undefined,
            place: undefined,
            coordinates: {
              latitude: undefined,
              longitude: undefined,
              altitude: undefined,
            },
          },
        },
        camera: {
          make: undefined,
          model: undefined,
          serial: undefined,
        },
        lens: {
          make: undefined,
          model: undefined,
          serial: undefined,
        },
        exposure: {
          focalLength: undefined,
          aperture: undefined,
          exposureTime: undefined,
          iso: undefined,
        },
        dimensions: {
          original: {
            width: undefined,
            height: undefined,
          },
          display: {
            width: undefined,
            height: undefined,
          },
          thumbnail: {
            width: undefined,
            height: undefined,
          },
        },
      })
    ).toStrictEqual({
      query:
        "UPDATE photo SET" +
        " title=?, description=?, author=?," +
        " taken=?, country_code=?, place=?, coord_lat=?, coord_lon=?, coord_alt=?," +
        " camera_make=?, camera_model=?, camera_serial=?, lens_make=?, lens_model=?, lens_serial=?," +
        " focal=?, fstop=?, exposure_time=?, iso=?," +
        " orig_width=?, orig_height=?, disp_width=?, disp_height=?, thumb_width=?, thumb_height=?" +
        " WHERE id = ?",
      values: [
        undefined,
        undefined,
        undefined,

        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,

        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,

        undefined,
        undefined,
        undefined,
        undefined,

        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ],
    }));
  test("Build update by id query: all EXIF", () =>
    expect(
      schema.photo.buildUpdateByIdQuery({
        id: "new id",
        taken: {
          instant: {
            timestamp: "2020-10-13 12:34:56",
            year: 2020,
            month: 10,
            day: 13,
            hour: 12,
            minute: 34,
            second: 56,
          },
          author: "new author",
          location: {
            coordinates: {
              latitude: 1.0,
              longitude: -1.0,
              altitude: 100,
            },
          },
        },
        camera: {
          make: "new camera_make",
          model: "new camera_model",
          serial: "new camera_serial",
        },
        lens: {
          make: "new lens_make",
          model: "new lens_model",
          serial: "new lens_serial",
        },
        exposure: {
          focalLength: 50,
          aperture: 1.0,
          exposureTime: 0.1,
          iso: 100,
        },
        dimensions: {},
      })
    ).toStrictEqual({
      query:
        "UPDATE photo SET" +
        " author=?," +
        " taken=?, coord_lat=?, coord_lon=?, coord_alt=?," +
        " camera_make=?, camera_model=?, camera_serial=?, lens_make=?, lens_model=?, lens_serial=?," +
        " focal=?, fstop=?, exposure_time=?, iso=?" +
        " WHERE id = ?",
      values: [
        "new author",

        "2020-10-13 12:34:56",
        1.0,
        -1.0,
        100,

        "new camera_make",
        "new camera_model",
        "new camera_serial",
        "new lens_make",
        "new lens_model",
        "new lens_serial",

        50,
        1.0,
        0.1,
        100,
      ],
    }));
  test("Build delete by id query", () =>
    expect(schema.photo.buildDeleteByIdQuery()).toBe(
      "DELETE FROM photo WHERE id = ?"
    ));
  test("Build select all query", () =>
    expect(schema.photo.buildSelectQuery()).toBe(
      `SELECT ${cols} FROM photo ORDER BY taken ASC,id ASC`
    ));
  test("Build select by condition query", () =>
    expect(schema.photo.buildSelectQuery(["id = ?"])).toBe(
      `SELECT ${cols} FROM photo WHERE id = ? ORDER BY taken ASC,id ASC`
    ));
  test("Build delete all query", () =>
    expect(schema.photo.buildDeleteQuery()).toBe("DELETE FROM photo"));
  test("Build delete by condition query", () =>
    expect(schema.photo.buildDeleteQuery(["id = ?"])).toBe(
      "DELETE FROM photo WHERE id = ?"
    ));
});
