import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsPeople, BsPeopleFill, BsXLg, BsArrowDown, BsArrowUp } from "react-icons/bs";

import userGalleryService, {
  type UserGalleryRow,
} from "../../services/user-gallery";
import groupGalleryService, {
  type GroupGalleryRow,
} from "../../services/group-gallery";
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
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
`;
// width: 1% + nowrap on every column except the second one (the
// Subject column, which carries the longest content). All others
// hug their content.
const Th = styled.th<{ $sortable?: boolean }>`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  &:user-select {
    user-select: none;
  }
  &:not(:nth-of-type(2)) {
    width: 1%;
  }
  &:hover {
    color: ${({ $sortable }) =>
      $sortable ? "var(--primary-color)" : "var(--inactive-color)"};
  }
`;
const SortIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  &:not(:nth-of-type(2)) {
    width: 1%;
    white-space: nowrap;
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
  isAdmin: boolean;
  hideMap: HideMapValue;
}

type SortKey = "gallery" | "subject" | "type" | "admin" | "hidemap";

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

  const userRows = ((userGalleryQuery.data as UserGalleryRow[] | undefined) ?? []).map(
    (r): AccessRow => ({
      galleryId: r.gallery_id,
      subjectId: r.user_id,
      type: "user",
      isAdmin: !!r.is_admin,
      hideMap: hideMapFromDb(r.hide_map),
    })
  );
  const groupRows = ((groupGalleryQuery.data as GroupGalleryRow[] | undefined) ?? []).map(
    (r): AccessRow => ({
      galleryId: r.gallery_id,
      subjectId: r.group_id,
      type: "group",
      isAdmin: !!r.is_admin,
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

  // Sort.
  const sort = (searchParams.get("sort") ?? "gallery") as SortKey;
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
    if (adminFilter === "1" && !r.isAdmin) return false;
    if (adminFilter === "0" && r.isAdmin) return false;
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
    if (sort === "type") {
      const c = compareString(a.type, b.type);
      return c !== 0 ? factor * c : compareString(a.galleryId, b.galleryId);
    }
    if (sort === "admin") {
      const c = Number(a.isAdmin) - Number(b.isAdmin);
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
      isAdmin: boolean;
      hideMap: HideMapValue;
    }) =>
      userGalleryService.upsert(args.userId, args.galleryId, {
        isAdmin: args.isAdmin,
        hideMap: hideMapToBody(args.hideMap),
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
      isAdmin: boolean;
      hideMap: HideMapValue;
    }) =>
      groupGalleryService.upsert(args.groupId, args.galleryId, {
        isAdmin: args.isAdmin,
        hideMap: hideMapToBody(args.hideMap),
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
    isAdmin: boolean,
    hideMap: HideMapValue
  ) => {
    setActionError(null);
    if (row.type === "user") {
      upsertUserMutation.mutate({
        userId: row.subjectId,
        galleryId: row.galleryId,
        isAdmin,
        hideMap,
      });
    } else {
      upsertGroupMutation.mutate({
        groupId: row.subjectId,
        galleryId: row.galleryId,
        isAdmin,
        hideMap,
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
        <Table>
          <thead>
            <tr>
              <Th $sortable onClick={() => setSort("gallery")}>
                {t("manage-access-col-gallery")}
                {sortIndicator("gallery")}
              </Th>
              <Th $sortable onClick={() => setSort("subject")}>
                {t("manage-access-col-subject")}
                {sortIndicator("subject")}
              </Th>
              <Th $sortable onClick={() => setSort("type")}>
                {t("manage-access-col-type")}
                {sortIndicator("type")}
              </Th>
              <Th $sortable onClick={() => setSort("admin")}>
                {t("manage-gallery-access-col-admin")}
                {sortIndicator("admin")}
              </Th>
              <Th $sortable onClick={() => setSort("hidemap")}>
                {t("manage-gallery-access-col-hidemap")}
                {sortIndicator("hidemap")}
              </Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.type}:${row.subjectId}:${row.galleryId}`}>
                <Td>
                  <GalleryLink
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/m/g/${row.galleryId}/access`)}
                  >
                    <Mono>{row.galleryId}</Mono>
                  </GalleryLink>
                </Td>
                <Td>
                  <Mono>{row.subjectId}</Mono>
                </Td>
                <Td>
                  {row.type === "user" ? (
                    <BsPeople aria-hidden title={String(t("manage-access-type-user"))} />
                  ) : (
                    <BsPeopleFill aria-hidden title={String(t("manage-access-type-group"))} />
                  )}
                </Td>
                <Td>
                  <Checkbox
                    type="checkbox"
                    checked={row.isAdmin}
                    disabled={mutating}
                    onChange={(e) =>
                      onUpsert(row, e.target.checked, row.hideMap)
                    }
                    aria-label={String(t("manage-gallery-access-col-admin"))}
                  />
                </Td>
                <Td>
                  <Select
                    value={row.hideMap}
                    disabled={mutating}
                    onChange={(e) =>
                      onUpsert(row, row.isAdmin, e.target.value as HideMapValue)
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
                    <BsXLg />
                  </RemoveButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Root>
  );
};

export default Access;
