import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BsChevronDown,
  BsChevronRight,
  BsImages,
  BsPencilSquare,
  BsPlus,
  BsXLg,
} from "react-icons/bs";

import userGalleryService, {
  type UserGalleryRow,
} from "../../services/user-gallery";
import groupGalleryService, {
  type GroupGalleryRow,
} from "../../services/group-gallery";
import usersService, { type UserRow } from "../../services/users";
import groupsService, { type GroupRow } from "../../services/groups";
import { useUserStore } from "../../stores";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: left;
`;
const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 16px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.2em;
`;
const SiblingNav = styled.nav`
  display: inline-flex;
  gap: 8px;
`;
const SiblingLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85em;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const SectionBlock = styled.section`
  margin-bottom: 32px;
`;
const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 0.95em;
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0 0 12px;
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
  margin-bottom: 12px;
`;
// width: 1% + nowrap on every column except the first one shrinks
// the controls (admin / hide-map / remove) to fit their content
// and lets the user/group column take the slack.
const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  &:not(:first-of-type) {
    width: 1%;
    white-space: nowrap;
  }
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  &:not(:first-of-type) {
    width: 1%;
    white-space: nowrap;
  }
`;
const ExpandButton = styled.button`
  background: none;
  border: none;
  color: var(--inactive-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0 4px 0 0;
  &:hover {
    color: var(--primary-color);
  }
`;
const MembersCell = styled.td`
  padding: 0 12px 8px 36px;
  border-bottom: 1px solid var(--inactive-color);
  font-size: 0.85em;
  color: var(--inactive-color);
`;
const MemberChip = styled.span`
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95em;
  padding: 1px 6px;
  margin: 2px 4px 2px 0;
  background: var(--primary-background);
  border: 1px solid var(--inactive-color);
  border-radius: 10px;
  color: var(--primary-color);
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
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
const AddRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 0;
`;
const AddButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const AddLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  color: var(--inactive-color);
`;

// hide_map column values: 1 = hide, 0 = show, null = inherit.
type HideMapValue = "hide" | "show" | "inherit";
const hideMapFromDb = (n: number | null): HideMapValue =>
  n === 1 ? "hide" : n === 0 ? "show" : "inherit";
const hideMapToBody = (
  v: HideMapValue
): boolean | null | undefined => {
  if (v === "hide") return true;
  if (v === "show") return false;
  return null;
};

const GalleryAccess = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const galleryId = params.galleryId as string;
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const userGrantsQuery = useQuery({
    queryKey: ["manage-user-gallery", galleryId, user?.id ?? null],
    queryFn: () => userGalleryService.list({ galleryId }),
    enabled: !!galleryId && !!user?.isAdmin(),
  });
  const groupGrantsQuery = useQuery({
    queryKey: ["manage-group-gallery", galleryId, user?.id ?? null],
    queryFn: () => groupGalleryService.list({ galleryId }),
    enabled: !!galleryId && !!user?.isAdmin(),
  });
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

  const [actionError, setActionError] = React.useState<string | null>(null);

  const invalidateUserGrants = () =>
    queryClient.invalidateQueries({
      queryKey: ["manage-user-gallery", galleryId],
    });
  const invalidateGroupGrants = () =>
    queryClient.invalidateQueries({
      queryKey: ["manage-group-gallery", galleryId],
    });

  const upsertUserMutation = useMutation({
    mutationFn: (args: {
      userId: string;
      isAdmin: boolean;
      hideMap: HideMapValue;
    }) =>
      userGalleryService.upsert(args.userId, galleryId, {
        isAdmin: args.isAdmin,
        hideMap: hideMapToBody(args.hideMap),
      }),
    onSuccess: invalidateUserGrants,
    onError: (err: Error) => setActionError(err.message),
  });
  const removeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      userGalleryService.remove(userId, galleryId),
    onSuccess: invalidateUserGrants,
    onError: (err: Error) => setActionError(err.message),
  });
  const upsertGroupMutation = useMutation({
    mutationFn: (args: {
      groupId: string;
      isAdmin: boolean;
      hideMap: HideMapValue;
    }) =>
      groupGalleryService.upsert(args.groupId, galleryId, {
        isAdmin: args.isAdmin,
        hideMap: hideMapToBody(args.hideMap),
      }),
    onSuccess: invalidateGroupGrants,
    onError: (err: Error) => setActionError(err.message),
  });
  const removeGroupMutation = useMutation({
    mutationFn: (groupId: string) =>
      groupGalleryService.remove(groupId, galleryId),
    onSuccess: invalidateGroupGrants,
    onError: (err: Error) => setActionError(err.message),
  });

  const userGrants = ((userGrantsQuery.data as UserGalleryRow[] | undefined) ?? [])
    .slice()
    .sort((a, b) => a.user_id.localeCompare(b.user_id));
  const groupGrants = ((groupGrantsQuery.data as GroupGalleryRow[] | undefined) ?? [])
    .slice()
    .sort((a, b) => a.group_id.localeCompare(b.group_id));
  const allUsers = (usersQuery.data as UserRow[] | undefined) ?? [];
  const allGroups = (groupsQuery.data as GroupRow[] | undefined) ?? [];

  const userGrantedIds = new Set(userGrants.map((g) => g.user_id));
  const groupGrantedIds = new Set(groupGrants.map((g) => g.group_id));
  // `:guest` is a legitimate user_gallery grant target (it means
  // "anyone visiting"), so it's included here unlike in the Groups
  // member picker.
  const availableUsers = allUsers
    .filter((u) => !userGrantedIds.has(u.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const availableGroups = allGroups
    .filter((g) => !groupGrantedIds.has(g.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <Root>
      <TitleRow>
        <Title>
          <Mono>{galleryId}</Mono>
        </Title>
        <SiblingNav aria-label={String(t("manage-gallery-nav-group"))}>
          <SiblingLink
            onClick={() => navigate(`/m/g/${galleryId}`)}
            role="link"
            tabIndex={0}
          >
            <BsPencilSquare aria-hidden />
            {t("manage-gallery-link-edit")}
          </SiblingLink>
          <SiblingLink
            onClick={() => navigate(`/m/g/${galleryId}/photos`)}
            role="link"
            tabIndex={0}
          >
            <BsImages aria-hidden />
            {t("manage-gallery-link-photos")}
          </SiblingLink>
        </SiblingNav>
      </TitleRow>

      {actionError && (
        <ErrorBanner>
          {t("manage-gallery-access-error")}
          {": "}
          {actionError}
        </ErrorBanner>
      )}

      <SectionBlock>
        <SectionTitle>{t("manage-gallery-access-users")}</SectionTitle>
        <UserGrantsTable
          grants={userGrants}
          loading={userGrantsQuery.isLoading}
          onUpsert={(userId, isAdmin, hideMap) =>
            upsertUserMutation.mutate({ userId, isAdmin, hideMap })
          }
          onRemove={(userId) => removeUserMutation.mutate(userId)}
          mutating={
            upsertUserMutation.isPending || removeUserMutation.isPending
          }
        />
        <AddUserGrant
          available={availableUsers}
          mutating={upsertUserMutation.isPending}
          onAdd={(userId, isAdmin, hideMap) =>
            upsertUserMutation.mutate({ userId, isAdmin, hideMap })
          }
        />
      </SectionBlock>

      <SectionBlock>
        <SectionTitle>{t("manage-gallery-access-groups")}</SectionTitle>
        <GroupGrantsTable
          grants={groupGrants}
          loading={groupGrantsQuery.isLoading}
          onUpsert={(groupId, isAdmin, hideMap) =>
            upsertGroupMutation.mutate({ groupId, isAdmin, hideMap })
          }
          onRemove={(groupId) => removeGroupMutation.mutate(groupId)}
          mutating={
            upsertGroupMutation.isPending || removeGroupMutation.isPending
          }
        />
        <AddGroupGrant
          available={availableGroups}
          mutating={upsertGroupMutation.isPending}
          onAdd={(groupId, isAdmin, hideMap) =>
            upsertGroupMutation.mutate({ groupId, isAdmin, hideMap })
          }
        />
      </SectionBlock>
    </Root>
  );
};

interface UserGrantsTableProps {
  grants: UserGalleryRow[];
  loading: boolean;
  onUpsert: (userId: string, isAdmin: boolean, hideMap: HideMapValue) => void;
  onRemove: (userId: string) => void;
  mutating: boolean;
}

const UserGrantsTable = ({
  grants,
  loading,
  onUpsert,
  onRemove,
  mutating,
}: UserGrantsTableProps): React.ReactElement => {
  const { t } = useTranslation();
  if (loading) return <Notice>{t("loading")}</Notice>;
  if (grants.length === 0) return <Notice>{t("manage-gallery-access-empty-users")}</Notice>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{t("manage-gallery-access-col-user")}</Th>
          <Th>{t("manage-gallery-access-col-admin")}</Th>
          <Th>{t("manage-gallery-access-col-hidemap")}</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {grants.map((g) => (
          <GrantRow
            key={g.user_id}
            id={g.user_id}
            isAdmin={!!g.is_admin}
            hideMap={hideMapFromDb(g.hide_map)}
            onUpsert={(isAdmin, hideMap) =>
              onUpsert(g.user_id, isAdmin, hideMap)
            }
            onRemove={() => onRemove(g.user_id)}
            mutating={mutating}
          />
        ))}
      </tbody>
    </Table>
  );
};

interface GroupGrantsTableProps {
  grants: GroupGalleryRow[];
  loading: boolean;
  onUpsert: (groupId: string, isAdmin: boolean, hideMap: HideMapValue) => void;
  onRemove: (groupId: string) => void;
  mutating: boolean;
}

const GroupGrantsTable = ({
  grants,
  loading,
  onUpsert,
  onRemove,
  mutating,
}: GroupGrantsTableProps): React.ReactElement => {
  const { t } = useTranslation();
  if (loading) return <Notice>{t("loading")}</Notice>;
  if (grants.length === 0) return <Notice>{t("manage-gallery-access-empty-groups")}</Notice>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{t("manage-gallery-access-col-group")}</Th>
          <Th>{t("manage-gallery-access-col-admin")}</Th>
          <Th>{t("manage-gallery-access-col-hidemap")}</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {grants.map((g) => (
          <GroupGrantRow
            key={g.group_id}
            groupId={g.group_id}
            isAdmin={!!g.is_admin}
            hideMap={hideMapFromDb(g.hide_map)}
            onUpsert={(isAdmin, hideMap) =>
              onUpsert(g.group_id, isAdmin, hideMap)
            }
            onRemove={() => onRemove(g.group_id)}
            mutating={mutating}
          />
        ))}
      </tbody>
    </Table>
  );
};

// Group rows get an expand chevron next to the id; clicking it
// lazy-fetches the group's members and shows them inline below
// the row. Two TRs instead of one when expanded — visually a
// continuation of the row above thanks to the shared bottom
// border and indented padding.
interface GroupGrantRowProps {
  groupId: string;
  isAdmin: boolean;
  hideMap: HideMapValue;
  onUpsert: (isAdmin: boolean, hideMap: HideMapValue) => void;
  onRemove: () => void;
  mutating: boolean;
}

const GroupGrantRow = ({
  groupId,
  isAdmin,
  hideMap,
  onUpsert,
  onRemove,
  mutating,
}: GroupGrantRowProps): React.ReactElement => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const user = useUserStore((s) => s.user);
  const membersQuery = useQuery({
    queryKey: ["manage-group-members", groupId, user?.id ?? null],
    queryFn: () => groupsService.getMembers(groupId),
    enabled: expanded && !!user?.isAdmin(),
  });
  const members = (membersQuery.data as string[] | undefined) ?? [];
  return (
    <>
      <tr>
        <Td>
          <ExpandButton
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={String(
              expanded
                ? t("manage-gallery-access-collapse-members")
                : t("manage-gallery-access-expand-members")
            )}
            title={String(
              expanded
                ? t("manage-gallery-access-collapse-members")
                : t("manage-gallery-access-expand-members")
            )}
          >
            {expanded ? <BsChevronDown /> : <BsChevronRight />}
          </ExpandButton>
          <Mono>{groupId}</Mono>
        </Td>
        <Td>
          <Checkbox
            type="checkbox"
            checked={isAdmin}
            disabled={mutating}
            onChange={(e) => onUpsert(e.target.checked, hideMap)}
            aria-label={String(t("manage-gallery-access-col-admin"))}
          />
        </Td>
        <Td>
          <Select
            value={hideMap}
            disabled={mutating}
            onChange={(e) =>
              onUpsert(isAdmin, e.target.value as HideMapValue)
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
            onClick={onRemove}
            disabled={mutating}
            aria-label={String(t("manage-gallery-access-remove", { id: groupId }))}
            title={String(t("manage-gallery-access-remove", { id: groupId }))}
          >
            <BsXLg />
          </RemoveButton>
        </Td>
      </tr>
      {expanded && (
        <tr>
          <MembersCell colSpan={4}>
            {membersQuery.isLoading ? (
              <span>{t("loading")}</span>
            ) : members.length === 0 ? (
              <span>{t("manage-gallery-access-members-empty")}</span>
            ) : (
              members.map((id) => <MemberChip key={id}>{id}</MemberChip>)
            )}
          </MembersCell>
        </tr>
      )}
    </>
  );
};

// One row in either table. Local state mirrors the row's current
// values; changing the admin checkbox or hide-map select fires an
// upsert immediately (the API is idempotent and the operator
// expects the row to settle on what they picked).
interface GrantRowProps {
  id: string;
  isAdmin: boolean;
  hideMap: HideMapValue;
  onUpsert: (isAdmin: boolean, hideMap: HideMapValue) => void;
  onRemove: () => void;
  mutating: boolean;
}

const GrantRow = ({
  id,
  isAdmin,
  hideMap,
  onUpsert,
  onRemove,
  mutating,
}: GrantRowProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <tr>
      <Td>
        <Mono>{id}</Mono>
      </Td>
      <Td>
        <Checkbox
          type="checkbox"
          checked={isAdmin}
          disabled={mutating}
          onChange={(e) => onUpsert(e.target.checked, hideMap)}
          aria-label={String(t("manage-gallery-access-col-admin"))}
        />
      </Td>
      <Td>
        <Select
          value={hideMap}
          disabled={mutating}
          onChange={(e) =>
            onUpsert(isAdmin, e.target.value as HideMapValue)
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
          onClick={onRemove}
          disabled={mutating}
          aria-label={String(t("manage-gallery-access-remove", { id }))}
          title={String(t("manage-gallery-access-remove", { id }))}
        >
          <BsXLg />
        </RemoveButton>
      </Td>
    </tr>
  );
};

interface AddUserGrantProps {
  available: UserRow[];
  mutating: boolean;
  onAdd: (userId: string, isAdmin: boolean, hideMap: HideMapValue) => void;
}

const AddUserGrant = ({
  available,
  mutating,
  onAdd,
}: AddUserGrantProps): React.ReactElement => {
  const { t } = useTranslation();
  const [picked, setPicked] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [hideMap, setHideMap] = React.useState<HideMapValue>("inherit");
  const handleAdd = () => {
    if (!picked) return;
    onAdd(picked, isAdmin, hideMap);
    setPicked("");
    setIsAdmin(false);
    setHideMap("inherit");
  };
  return (
    <AddRow>
      <Select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        disabled={available.length === 0 || mutating}
      >
        <option value="">
          {available.length === 0
            ? t("manage-gallery-access-no-available-users")
            : t("manage-gallery-access-pick-user")}
        </option>
        {available.map((u) => (
          <option key={u.id} value={u.id}>
            {u.id}
            {u.isAdmin ? " (" + t("manage-users-role-admin") + ")" : ""}
          </option>
        ))}
      </Select>
      <AddLabel>
        <Checkbox
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        {t("manage-gallery-access-col-admin")}
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
      <AddButton type="button" onClick={handleAdd} disabled={!picked || mutating}>
        <BsPlus aria-hidden />
        {t("manage-gallery-access-add")}
      </AddButton>
    </AddRow>
  );
};

interface AddGroupGrantProps {
  available: GroupRow[];
  mutating: boolean;
  onAdd: (groupId: string, isAdmin: boolean, hideMap: HideMapValue) => void;
}

const AddGroupGrant = ({
  available,
  mutating,
  onAdd,
}: AddGroupGrantProps): React.ReactElement => {
  const { t } = useTranslation();
  const [picked, setPicked] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [hideMap, setHideMap] = React.useState<HideMapValue>("inherit");
  const handleAdd = () => {
    if (!picked) return;
    onAdd(picked, isAdmin, hideMap);
    setPicked("");
    setIsAdmin(false);
    setHideMap("inherit");
  };
  return (
    <AddRow>
      <Select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        disabled={available.length === 0 || mutating}
      >
        <option value="">
          {available.length === 0
            ? t("manage-gallery-access-no-available-groups")
            : t("manage-gallery-access-pick-group")}
        </option>
        {available.map((g) => (
          <option key={g.id} value={g.id}>
            {g.id}
            {g.title ? ` — ${g.title}` : ""}
          </option>
        ))}
      </Select>
      <AddLabel>
        <Checkbox
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        {t("manage-gallery-access-col-admin")}
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
      <AddButton type="button" onClick={handleAdd} disabled={!picked || mutating}>
        <BsPlus aria-hidden />
        {t("manage-gallery-access-add")}
      </AddButton>
    </AddRow>
  );
};

export default GalleryAccess;
