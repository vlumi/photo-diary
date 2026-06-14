import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BsArrowDown,
  BsArrowUp,
  BsPeople,
  BsPerson,
  BsPlus,
  BsTrash3,
} from "react-icons/bs";

import userGalleryService, {
  type UserGalleryRow,
} from "../../services/user-gallery";
import groupGalleryService, {
  type GroupGalleryRow,
} from "../../services/group-gallery";
import usersService, { type UserRow } from "../../services/users";
import groupsService, { type GroupRow } from "../../services/groups";
import galleriesService from "../../services/galleries";
import { useUserStore } from "../../stores";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: left;
`;
const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 1.2em;
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
`;
const AdminsBlock = styled.section`
  margin-bottom: 20px;
  padding: 10px 14px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  background: var(--primary-background);
`;
const AdminsHeading = styled.div`
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  margin-bottom: 6px;
`;
const AdminsHint = styled.div`
  font-size: 0.8em;
  color: var(--inactive-color);
  font-style: italic;
  margin-top: 6px;
`;
const AdminChip = styled.a`
  display: inline-block;
  padding: 2px 10px;
  margin: 2px 4px 2px 0;
  background: var(--primary-background);
  border: 1px solid var(--inactive-color);
  border-radius: 12px;
  color: var(--primary-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
  cursor: pointer;
  text-decoration: none;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin-bottom: 12px;
`;
const FilterLabel = styled.span`
  font-size: 0.85em;
  color: var(--inactive-color);
  margin-right: 4px;
`;
const Chip = styled.button<{ $active: boolean }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--inactive-color);
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--primary-color)"};
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
`;
// Mobile / narrow-viewport horizontal scroll for the wide access
// table. On desktop it's a no-op — the table fits inside the
// Root's 1200px bound; on phones the columns scroll instead of
// pushing the whole page wide.
const TableScroll = styled.div`
  overflow-x: auto;
  width: 100%;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
`;
// $wide marks the column that takes the slack; everything else
// hugs its content. Position-agnostic so re-ordering columns
// doesn't require fiddling with nth-of-type indices.
const Th = styled.th<{
  $sortable?: boolean;
  $wide?: boolean;
  $center?: boolean;
}>`
  text-align: ${({ $center }) => ($center ? "center" : "left")};
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;
  width: ${({ $wide }) => ($wide ? "auto" : "1%")};
  &:hover {
    color: ${({ $sortable }) =>
      $sortable ? "var(--primary-color)" : "var(--inactive-color)"};
  }
  @media (max-width: 640px) {
    padding: 6px 6px;
  }
`;
const SortIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
`;
const Td = styled.td<{ $wide?: boolean; $center?: boolean }>`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  text-align: ${({ $center }) => ($center ? "center" : "left")};
  width: ${({ $wide }) => ($wide ? "auto" : "1%")};
  white-space: ${({ $wide }) => ($wide ? "normal" : "nowrap")};
  @media (max-width: 640px) {
    padding: 6px 6px;
  }
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
`;
const GalleryLink = styled.a`
  color: inherit;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;
const SubjectLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;
const AddPanel = styled.section`
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  background: var(--primary-background);
`;
const AddHeading = styled.div`
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  margin-bottom: 8px;
`;
const AddGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;
const AddButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const AddLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9em;
  color: var(--primary-color);
`;
const Select = styled.select`
  font: inherit;
  padding: 4px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const Checkbox = styled.input`
  cursor: pointer;
`;
const RemoveButton = styled.button`
  background: none;
  border: none;
  color: var(--inactive-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  &:hover {
    color: #c33;
  }
`;

type HideMapValue = "hide" | "show" | "inherit";
const hideMapFromDb = (n: number | null): HideMapValue =>
  n === 1 ? "hide" : n === 0 ? "show" : "inherit";
const hideMapToBody = (v: HideMapValue): boolean | null | undefined => {
  if (v === "hide") return true;
  if (v === "show") return false;
  return null;
};

// Unified row shape for the flat table — both user and group
// grants flatten to this so the sort + filter + render code
// doesn't have to special-case the two sources.
interface AccessRow {
  galleryId: string;
  subjectId: string;
  type: "user" | "group";
  isEditor: boolean;
  canSeePrivate: boolean;
  hideMap: HideMapValue;
}

type SortKey = "gallery" | "subject" | "admin" | "private" | "hidemap";

const Access = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const userGalleryQuery = useQuery({
    queryKey: ["manage-user-gallery-all", user?.id ?? null],
    queryFn: () => userGalleryService.list(),
    enabled: !!user?.isAdmin(),
  });
  const groupGalleryQuery = useQuery({
    queryKey: ["manage-group-gallery-all", user?.id ?? null],
    queryFn: () => groupGalleryService.list(),
    enabled: !!user?.isAdmin(),
  });
  // Global admins (user.is_editor = 1) bypass the per-gallery ACL
  // entirely and don't show up in user_gallery / group_gallery,
  // so the table never lists them. Surface them as a small
  // banner above the filters for context.
  const usersQuery = useQuery({
    queryKey: ["manage-users", user?.id ?? null],
    queryFn: () => usersService.getAll(),
    enabled: !!user?.isAdmin(),
  });
  const groupsQuery = useQuery({
    queryKey: ["manage-groups", user?.id ?? null],
    queryFn: () => groupsService.getAll(),
    enabled: !!user?.isAdmin(),
  });
  const galleriesQuery = useQuery({
    queryKey: ["manage-galleries", user?.id ?? null],
    queryFn: () => galleriesService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const userRows = ((userGalleryQuery.data as UserGalleryRow[] | undefined) ?? []).map(
    (r): AccessRow => ({
      galleryId: r.gallery_id,
      subjectId: r.user_id,
      type: "user",
      isEditor: !!r.is_editor,
      canSeePrivate: !!r.can_see_private,
      hideMap: hideMapFromDb(r.hide_map),
    })
  );
  const groupRows = ((groupGalleryQuery.data as GroupGalleryRow[] | undefined) ?? []).map(
    (r): AccessRow => ({
      galleryId: r.gallery_id,
      subjectId: r.group_id,
      type: "group",
      isEditor: !!r.is_editor,
      canSeePrivate: !!r.can_see_private,
      hideMap: hideMapFromDb(r.hide_map),
    })
  );
  const allRows = [...userRows, ...groupRows];

  // Filters (URL-parameterised so a narrowed view is shareable).
  const typeFilter = searchParams.get("type") ?? ""; // "user" | "group" | ""
  const galleryFilter = searchParams.get("gallery") ?? "";
  const adminFilter = searchParams.get("admin") ?? ""; // "1" | "0" | ""
  const setParam = (name: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === "") next.delete(name);
      else next.set(name, value);
      return next;
    });
  };

  const sort = (searchParams.get("sort") ?? "subject") as SortKey;
  const dir = (searchParams.get("dir") ?? "asc") as "asc" | "desc";
  const setSort = (key: SortKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sort === key) {
        next.set("dir", dir === "asc" ? "desc" : "asc");
      } else {
        next.set("sort", key);
        next.set("dir", "asc");
      }
      return next;
    });
  };

  const galleryIds = Array.from(new Set(allRows.map((r) => r.galleryId))).sort();

  const filtered = allRows.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (galleryFilter && r.galleryId !== galleryFilter) return false;
    if (adminFilter === "1" && !r.isEditor) return false;
    if (adminFilter === "0" && r.isEditor) return false;
    return true;
  });
  const sorted = filtered.slice().sort((a, b) => {
    const factor = dir === "asc" ? 1 : -1;
    const compareString = (x: string, y: string) =>
      x < y ? -1 : x > y ? 1 : 0;
    if (sort === "gallery") {
      const c = compareString(a.galleryId, b.galleryId);
      return c !== 0 ? factor * c : compareString(a.subjectId, b.subjectId);
    }
    if (sort === "subject") {
      const c = compareString(a.subjectId, b.subjectId);
      return c !== 0 ? factor * c : compareString(a.galleryId, b.galleryId);
    }
    if (sort === "admin") {
      const c = Number(a.isEditor) - Number(b.isEditor);
      return c !== 0
        ? factor * c
        : compareString(a.galleryId, b.galleryId);
    }
    if (sort === "private") {
      const c =
        Number(a.isEditor || a.canSeePrivate) -
        Number(b.isEditor || b.canSeePrivate);
      return c !== 0
        ? factor * c
        : compareString(a.galleryId, b.galleryId);
    }
    if (sort === "hidemap") {
      const order = { inherit: 0, show: 1, hide: 2 } as const;
      const c = order[a.hideMap] - order[b.hideMap];
      return c !== 0
        ? factor * c
        : compareString(a.galleryId, b.galleryId);
    }
    return 0;
  });

  const upsertUserMutation = useMutation({
    mutationFn: (args: {
      userId: string;
      galleryId: string;
      isEditor: boolean;
      hideMap: HideMapValue;
      canSeePrivate: boolean;
    }) =>
      userGalleryService.upsert(args.userId, args.galleryId, {
        isEditor: args.isEditor,
        hideMap: hideMapToBody(args.hideMap),
        canSeePrivate: args.canSeePrivate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-user-gallery-all"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const upsertGroupMutation = useMutation({
    mutationFn: (args: {
      groupId: string;
      galleryId: string;
      isEditor: boolean;
      hideMap: HideMapValue;
      canSeePrivate: boolean;
    }) =>
      groupGalleryService.upsert(args.groupId, args.galleryId, {
        isEditor: args.isEditor,
        hideMap: hideMapToBody(args.hideMap),
        canSeePrivate: args.canSeePrivate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-group-gallery-all"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const removeUserMutation = useMutation({
    mutationFn: (args: { userId: string; galleryId: string }) =>
      userGalleryService.remove(args.userId, args.galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-user-gallery-all"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const removeGroupMutation = useMutation({
    mutationFn: (args: { groupId: string; galleryId: string }) =>
      groupGalleryService.remove(args.groupId, args.galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-group-gallery-all"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });
  const mutating =
    upsertUserMutation.isPending ||
    upsertGroupMutation.isPending ||
    removeUserMutation.isPending ||
    removeGroupMutation.isPending;

  const onUpsert = (
    row: AccessRow,
    isEditor: boolean,
    hideMap: HideMapValue,
    canSeePrivate: boolean
  ) => {
    setActionError(null);
    if (row.type === "user") {
      upsertUserMutation.mutate({
        userId: row.subjectId,
        galleryId: row.galleryId,
        isEditor,
        hideMap,
        canSeePrivate,
      });
    } else {
      upsertGroupMutation.mutate({
        groupId: row.subjectId,
        galleryId: row.galleryId,
        isEditor,
        hideMap,
        canSeePrivate,
      });
    }
  };
  const onRemove = (row: AccessRow) => {
    setActionError(null);
    if (row.type === "user") {
      removeUserMutation.mutate({
        userId: row.subjectId,
        galleryId: row.galleryId,
      });
    } else {
      removeGroupMutation.mutate({
        groupId: row.subjectId,
        galleryId: row.galleryId,
      });
    }
  };

  const sortIndicator = (key: SortKey): React.ReactNode => {
    if (sort !== key) return null;
    return (
      <SortIndicator>
        {dir === "asc" ? <BsArrowUp /> : <BsArrowDown />}
      </SortIndicator>
    );
  };

  const isLoading = userGalleryQuery.isLoading || groupGalleryQuery.isLoading;
  const isError = userGalleryQuery.isError || groupGalleryQuery.isError;

  const globalAdmins = ((usersQuery.data as UserRow[] | undefined) ?? [])
    .filter((u) => u.isAdmin)
    .map((u) => u.id)
    .sort();

  return (
    <Root>
      <Title>{t("manage-page-access-title")}</Title>
      {actionError && (
        <ErrorBanner>
          {t("manage-access-error")}
          {": "}
          {actionError}
        </ErrorBanner>
      )}

      <AdminsBlock>
        <AdminsHeading>{t("manage-access-global-admins")}</AdminsHeading>
        {globalAdmins.length === 0 ? (
          <Notice>{t("manage-access-global-admins-empty")}</Notice>
        ) : (
          globalAdmins.map((id) => (
            <AdminChip
              key={id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/m/users/${id}`)}
              title={String(t("manage-access-global-admins-jump"))}
            >
              {id}
            </AdminChip>
          ))
        )}
        <AdminsHint>{t("manage-access-global-admins-hint")}</AdminsHint>
      </AdminsBlock>

      <FilterRow>
        <FilterLabel>{t("manage-access-filter-type")}</FilterLabel>
        <Chip
          type="button"
          $active={typeFilter === ""}
          onClick={() => setParam("type", null)}
        >
          {t("manage-access-filter-all")}
        </Chip>
        <Chip
          type="button"
          $active={typeFilter === "user"}
          onClick={() => setParam("type", "user")}
        >
          {t("manage-access-filter-users")}
        </Chip>
        <Chip
          type="button"
          $active={typeFilter === "group"}
          onClick={() => setParam("type", "group")}
        >
          {t("manage-access-filter-groups")}
        </Chip>
      </FilterRow>
      <FilterRow>
        <FilterLabel>{t("manage-access-filter-admin")}</FilterLabel>
        <Chip
          type="button"
          $active={adminFilter === ""}
          onClick={() => setParam("admin", null)}
        >
          {t("manage-access-filter-all")}
        </Chip>
        <Chip
          type="button"
          $active={adminFilter === "1"}
          onClick={() => setParam("admin", "1")}
        >
          {t("manage-gallery-access-col-admin")}
        </Chip>
        <Chip
          type="button"
          $active={adminFilter === "0"}
          onClick={() => setParam("admin", "0")}
        >
          {t("manage-access-filter-viewer")}
        </Chip>
      </FilterRow>
      {galleryIds.length > 1 && (
        <FilterRow>
          <FilterLabel>{t("manage-access-filter-gallery")}</FilterLabel>
          <Chip
            type="button"
            $active={galleryFilter === ""}
            onClick={() => setParam("gallery", null)}
          >
            {t("manage-access-filter-all")}
          </Chip>
          {galleryIds.map((id) => (
            <Chip
              key={id}
              type="button"
              $active={galleryFilter === id}
              onClick={() => setParam("gallery", id)}
            >
              {id}
            </Chip>
          ))}
        </FilterRow>
      )}

      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-access-load-error")}</Notice>
      ) : sorted.length === 0 ? (
        <Notice>{t("manage-access-empty")}</Notice>
      ) : (
        <TableScroll>
          <Table>
          <thead>
            <tr>
              <Th $sortable $wide onClick={() => setSort("subject")}>
                {t("manage-access-col-subject")}
                {sortIndicator("subject")}
              </Th>
              <Th $sortable onClick={() => setSort("gallery")}>
                {t("manage-access-col-gallery")}
                {sortIndicator("gallery")}
              </Th>
              <Th $sortable $center onClick={() => setSort("admin")}>
                {t("manage-gallery-access-col-admin")}
                {sortIndicator("admin")}
              </Th>
              <Th $sortable $center onClick={() => setSort("private")}>
                {t("manage-gallery-access-col-private")}
                {sortIndicator("private")}
              </Th>
              <Th $sortable $center onClick={() => setSort("hidemap")}>
                {t("manage-gallery-access-col-hidemap")}
                {sortIndicator("hidemap")}
              </Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.type}:${row.subjectId}:${row.galleryId}`}>
                <Td $wide>
                  <SubjectLink
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        row.type === "user"
                          ? `/m/users/${row.subjectId}`
                          : `/m/groups/${row.subjectId}`
                      )
                    }
                  >
                    {row.type === "user" ? (
                      <BsPerson
                        aria-hidden
                        title={String(t("manage-access-type-user"))}
                      />
                    ) : (
                      <BsPeople
                        aria-hidden
                        title={String(t("manage-access-type-group"))}
                      />
                    )}
                    <Mono>{row.subjectId}</Mono>
                  </SubjectLink>
                </Td>
                <Td>
                  <GalleryLink
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/m/g/${row.galleryId}/access`)}
                  >
                    <Mono>{row.galleryId}</Mono>
                  </GalleryLink>
                </Td>
                <Td $center>
                  <Checkbox
                    type="checkbox"
                    checked={row.isEditor}
                    disabled={mutating}
                    onChange={(e) =>
                      onUpsert(
                        row,
                        e.target.checked,
                        row.hideMap,
                        row.canSeePrivate
                      )
                    }
                    aria-label={String(t("manage-gallery-access-col-admin"))}
                  />
                </Td>
                <Td $center>
                  <Checkbox
                    type="checkbox"
                    checked={row.isEditor || row.canSeePrivate}
                    disabled={mutating || row.isEditor}
                    onChange={(e) =>
                      onUpsert(
                        row,
                        row.isEditor,
                        row.hideMap,
                        e.target.checked
                      )
                    }
                    aria-label={String(t("manage-gallery-access-col-private"))}
                    title={String(
                      row.isEditor
                        ? t("manage-gallery-access-private-implicit")
                        : t("manage-gallery-access-col-private")
                    )}
                  />
                </Td>
                <Td $center>
                  <Select
                    value={row.hideMap}
                    disabled={mutating}
                    onChange={(e) =>
                      onUpsert(
                        row,
                        row.isEditor,
                        e.target.value as HideMapValue,
                        row.canSeePrivate
                      )
                    }
                    aria-label={String(t("manage-gallery-access-col-hidemap"))}
                  >
                    <option value="inherit">
                      {t("manage-gallery-access-hidemap-inherit")}
                    </option>
                    <option value="show">
                      {t("manage-gallery-access-hidemap-show")}
                    </option>
                    <option value="hide">
                      {t("manage-gallery-access-hidemap-hide")}
                    </option>
                  </Select>
                </Td>
                <Td>
                  <RemoveButton
                    type="button"
                    onClick={() => onRemove(row)}
                    disabled={mutating}
                    aria-label={String(
                      t("manage-access-remove", {
                        subject: row.subjectId,
                        gallery: row.galleryId,
                      })
                    )}
                    title={String(
                      t("manage-access-remove", {
                        subject: row.subjectId,
                        gallery: row.galleryId,
                      })
                    )}
                  >
                    <BsTrash3 />
                  </RemoveButton>
                </Td>
              </tr>
            ))}
          </tbody>
          </Table>
        </TableScroll>
      )}

      <AddGrantPanel
        galleries={(galleriesQuery.data as Array<{ id: string }> | undefined) ?? []}
        users={(usersQuery.data as UserRow[] | undefined) ?? []}
        groups={(groupsQuery.data as GroupRow[] | undefined) ?? []}
        onAdd={(args) => {
          setActionError(null);
          if (args.subjectType === "user") {
            upsertUserMutation.mutate({
              userId: args.subjectId,
              galleryId: args.galleryId,
              isEditor: args.isEditor,
              hideMap: args.hideMap,
              canSeePrivate: args.canSeePrivate,
            });
          } else {
            upsertGroupMutation.mutate({
              groupId: args.subjectId,
              galleryId: args.galleryId,
              isEditor: args.isEditor,
              hideMap: args.hideMap,
              canSeePrivate: args.canSeePrivate,
            });
          }
        }}
        mutating={mutating}
      />
    </Root>
  );
};

interface AddGrantPanelProps {
  galleries: Array<{ id: string }>;
  users: UserRow[];
  groups: GroupRow[];
  onAdd: (args: {
    galleryId: string;
    subjectType: "user" | "group";
    subjectId: string;
    isEditor: boolean;
    hideMap: HideMapValue;
    canSeePrivate: boolean;
  }) => void;
  mutating: boolean;
}

// Single subject picker with optgroups for users vs groups —
// avoids the per-gallery page's two parallel forms while keeping
// the add flow on the global page small. The option value
// encodes the type so the submit handler routes to the right
// upsert without a separate type radio.
const AddGrantPanel = ({
  galleries,
  users,
  groups,
  onAdd,
  mutating,
}: AddGrantPanelProps): React.ReactElement => {
  const { t } = useTranslation();
  const [galleryId, setGalleryId] = React.useState("");
  const [subjectValue, setSubjectValue] = React.useState("");
  const [isEditor, setIsAdmin] = React.useState(false);
  const [canSeePrivate, setCanSeePrivate] = React.useState(false);
  const [hideMap, setHideMap] = React.useState<HideMapValue>("inherit");

  const sortedGalleries = galleries
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const sortedUsers = users.slice().sort((a, b) => a.id.localeCompare(b.id));
  const sortedGroups = groups.slice().sort((a, b) => a.id.localeCompare(b.id));

  const handleAdd = () => {
    if (!galleryId || !subjectValue) return;
    // Encoded as `<type>:<id>`. Split at the FIRST colon only —
    // ids can themselves contain colons (`:guest`), which the
    // limit-2 form of `.split(":", 2)` would eat.
    const colonIdx = subjectValue.indexOf(":");
    const subjectType = subjectValue.slice(0, colonIdx) as "user" | "group";
    const subjectId = subjectValue.slice(colonIdx + 1);
    onAdd({
      galleryId,
      subjectType,
      subjectId,
      isEditor,
      hideMap,
      canSeePrivate,
    });
    setSubjectValue("");
    setIsAdmin(false);
    setHideMap("inherit");
    setCanSeePrivate(false);
  };

  const canAdd = !!galleryId && !!subjectValue && !mutating;

  return (
    <AddPanel>
      <AddHeading>{t("manage-access-add-heading")}</AddHeading>
      <AddGrid>
        <Select
          value={galleryId}
          onChange={(e) => setGalleryId(e.target.value)}
          aria-label={String(t("manage-access-col-gallery"))}
        >
          <option value="">{t("manage-access-add-pick-gallery")}</option>
          {sortedGalleries.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id}
            </option>
          ))}
        </Select>
        <Select
          value={subjectValue}
          onChange={(e) => setSubjectValue(e.target.value)}
          aria-label={String(t("manage-access-col-subject"))}
        >
          <option value="">{t("manage-access-add-pick-subject")}</option>
          <optgroup label={String(t("manage-access-filter-users"))}>
            {sortedUsers.map((u) => (
              <option key={`user:${u.id}`} value={`user:${u.id}`}>
                {u.id}
                {u.name && u.name !== u.id ? ` — ${u.name}` : ""}
                {u.isAdmin ? " (" + t("manage-users-role-admin") + ")" : ""}
              </option>
            ))}
          </optgroup>
          <optgroup label={String(t("manage-access-filter-groups"))}>
            {sortedGroups.map((g) => (
              <option key={`group:${g.id}`} value={`group:${g.id}`}>
                {g.id}
                {g.name ? ` — ${g.name}` : ""}
              </option>
            ))}
          </optgroup>
        </Select>
        <AddLabel>
          <Checkbox
            type="checkbox"
            checked={isEditor}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          {t("manage-gallery-access-col-admin")}
        </AddLabel>
        <AddLabel>
          <Checkbox
            type="checkbox"
            checked={isEditor || canSeePrivate}
            disabled={isEditor}
            onChange={(e) => setCanSeePrivate(e.target.checked)}
          />
          {t("manage-gallery-access-col-private")}
        </AddLabel>
        <AddLabel>
          {t("manage-gallery-access-col-hidemap")}
          <Select
            value={hideMap}
            onChange={(e) => setHideMap(e.target.value as HideMapValue)}
          >
            <option value="inherit">
              {t("manage-gallery-access-hidemap-inherit")}
            </option>
            <option value="show">
              {t("manage-gallery-access-hidemap-show")}
            </option>
            <option value="hide">
              {t("manage-gallery-access-hidemap-hide")}
            </option>
          </Select>
        </AddLabel>
        <AddButton type="button" onClick={handleAdd} disabled={!canAdd}>
          <BsPlus aria-hidden />
          {t("manage-access-add-button")}
        </AddButton>
      </AddGrid>
    </AddPanel>
  );
};

export default Access;
