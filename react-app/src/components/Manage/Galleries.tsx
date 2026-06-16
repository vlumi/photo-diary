import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BsGripVertical,
  BsImages,
  BsPlus,
  BsShieldLock,
  BsSortAlphaDown,
} from "react-icons/bs";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import GalleryTypeIcon from "./GalleryTypeIcon";
import config from "../../lib/config";
import galleriesService from "../../services/galleries";
import { useNotificationsStore, useUserStore } from "../../stores";

// body has text-align: center globally; cancel it here so column
// content (and the heading above the table) lines up with the
// column header from the left. margin: 0 auto centres the bounded
// table on ultrawide screens instead of pinning it to the left.
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
const CreateButton = styled.button`
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
`;
const TitleActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;
const SortButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: var(--header-background);
    color: var(--header-color);
  }
  &:disabled {
    color: var(--inactive-color);
    cursor: not-allowed;
  }
`;
const DragHandleCell = styled.td`
  padding: 8px 0 8px 4px;
  width: 24px;
  vertical-align: middle;
`;
const DragHandle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: none;
  color: var(--inactive-color);
  cursor: grab;
  font-size: 1.1em;
  &:hover {
    color: var(--primary-color);
  }
  &:active {
    cursor: grabbing;
  }
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
`;
// Horizontal scroll only when the columns can't fit (mobile /
// narrow viewports). On wide screens it's a no-op — the table
// already fills 100% inside the Root's 1200px max-width.
const TableScroll = styled.div`
  overflow-x: auto;
  width: 100%;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
`;
// last-of-type width: 1% + nowrap shrinks the column to fit.
const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  &:last-of-type {
    width: 1%;
    white-space: nowrap;
  }
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  &:last-of-type {
    width: 1%;
    white-space: nowrap;
  }
`;
const Row = styled.tr`
  cursor: pointer;
  &:hover td {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
`;
// 32px square cover thumbnail in the leading cell. `object-fit:
// cover` keeps tall / wide icons centered without distortion;
// the placeholder Box keeps row heights consistent when an
// icon's missing.
const IconCell = styled.td`
  padding: 8px 0 8px 12px;
  width: 32px;
`;
const IconImg = styled.img`
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
  background: var(--header-background);
  display: block;
`;
const IconPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px dashed var(--inactive-color);
`;
const IdCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const Actions = styled.div`
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
`;
const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  background: var(--primary-background);
  text-decoration: none;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;

interface GalleryRow {
  id: string;
  title?: string;
  hostname?: string;
  theme?: string;
  icon?: string;
  epoch?: string;
  epochType?: string;
  type?: "real" | "hybrid" | "saved_filter";
}

// One row of the gallery list. Wraps with @dnd-kit/sortable so the
// drag handle in the leftmost cell moves the row; the rest of the
// row keeps the existing "click anywhere to open" behaviour. Drag-
// translate updates inline via the transform/transition styles
// `useSortable` returns.
interface SortableRowProps {
  gallery: GalleryRow;
}
const SortableRow = ({ gallery }: SortableRowProps): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    setNodeRef,
    transform,
    transition,
    listeners,
    attributes,
    isDragging,
  } = useSortable({ id: gallery.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <Row
      ref={setNodeRef}
      style={style}
      onClick={() =>
        navigate(`/m/g/${gallery.id}`, {
          state: { skipScrollRestore: true },
        })
      }
    >
      <DragHandleCell onClick={(e) => e.stopPropagation()}>
        <DragHandle
          type="button"
          aria-label={String(t("manage-galleries-drag-handle"))}
          title={String(t("manage-galleries-drag-handle"))}
          {...attributes}
          {...listeners}
        >
          <BsGripVertical aria-hidden />
        </DragHandle>
      </DragHandleCell>
      <IconCell>
        {gallery.icon ? (
          <IconImg
            src={`${config.PHOTO_ROOT_URL}${gallery.icon}`}
            alt=""
            loading="lazy"
          />
        ) : (
          <IconPlaceholder aria-hidden />
        )}
      </IconCell>
      <Td>
        <IdCell>
          <GalleryTypeIcon type={gallery.type} />
          <Mono>{gallery.id}</Mono>
        </IdCell>
      </Td>
      <Td>{gallery.title || ""}</Td>
      <Td>{gallery.epoch ? gallery.epoch.substring(0, 10) : ""}</Td>
      <Td>
        <Mono>{gallery.hostname || ""}</Mono>
      </Td>
      <Td>{gallery.theme || ""}</Td>
      <Td>
        <Actions>
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/m/photos?gallery=${gallery.id}`);
            }}
            role="link"
            tabIndex={0}
            title={String(t("manage-gallery-link-photos"))}
          >
            <BsImages aria-hidden />
            {t("manage-gallery-link-photos")}
          </ActionButton>
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/m/g/${gallery.id}/access`, {
                state: { skipScrollRestore: true },
              });
            }}
            role="link"
            tabIndex={0}
            title={String(t("manage-gallery-link-access"))}
          >
            <BsShieldLock aria-hidden />
            {t("manage-gallery-link-access")}
          </ActionButton>
        </Actions>
      </Td>
    </Row>
  );
};

const Galleries = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((s) => s.notify);
  // 4 px activation distance keeps row-clicks from being interpreted
  // as drags — operators can click a row to open it without the
  // handle stealing the gesture.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-galleries", user?.id ?? null],
    queryFn: () => galleriesService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  // Server returns galleries in (ordinal, id) order — render in that
  // order without re-sorting client-side. Rows are the cache
  // representation; drag-end calls the reorder mutation which
  // optimistically rewrites the cache via setQueryData.
  const rows = React.useMemo<GalleryRow[]>(() => {
    if (!Array.isArray(data)) return [];
    return data as GalleryRow[];
  }, [data]);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => galleriesService.reorder(ids),
    onError: (err: Error) => {
      // Revert: refetch to ditch the optimistic order.
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      notify("error", err.message);
    },
    onSuccess: () => {
      // Public surfaces (picker, title selector) consume the same
      // gallery list — invalidate so they pick up the new order too.
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
    },
  });

  const applyOrder = (ids: string[]) => {
    const before = data as GalleryRow[] | undefined;
    if (!before) return;
    const byId = new Map(before.map((g) => [g.id, g]));
    const next = ids.map((id) => byId.get(id)).filter(Boolean) as GalleryRow[];
    queryClient.setQueryData(["manage-galleries", user?.id ?? null], next);
    reorderMutation.mutate(ids);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = rows.map((g) => g.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    applyOrder(arrayMove(ids, from, to));
  };
  const handleSortById = () => {
    const ids = rows.map((g) => g.id).slice().sort();
    applyOrder(ids);
  };

  return (
    <Root>
      <TitleRow>
        <Title>{t("manage-page-galleries-title")}</Title>
        <TitleActions>
          <SortButton
            type="button"
            onClick={handleSortById}
            disabled={rows.length === 0 || reorderMutation.isPending}
            title={String(t("manage-galleries-sort-by-id"))}
          >
            <BsSortAlphaDown aria-hidden />
            {t("manage-galleries-sort-by-id")}
          </SortButton>
          <CreateButton
            type="button"
            onClick={() => navigate("/m/galleries/new")}
          >
            <BsPlus aria-hidden />
            {t("manage-galleries-create")}
          </CreateButton>
        </TitleActions>
      </TitleRow>
      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-galleries-load-error")}</Notice>
      ) : rows.length === 0 ? (
        <Notice>{t("manage-galleries-empty")}</Notice>
      ) : (
        <TableScroll>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <thead>
                <tr>
                  <Th></Th>
                  <Th></Th>
                  <Th>{t("manage-galleries-col-id")}</Th>
                  <Th>{t("manage-galleries-col-title")}</Th>
                  <Th>{t("manage-galleries-col-epoch")}</Th>
                  <Th>{t("manage-galleries-col-hostname")}</Th>
                  <Th>{t("manage-galleries-col-theme")}</Th>
                  <Th></Th>
                </tr>
              </thead>
              <SortableContext
                items={rows.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {rows.map((g) => (
                    <SortableRow key={g.id} gallery={g} />
                  ))}
                </tbody>
              </SortableContext>
            </Table>
          </DndContext>
        </TableScroll>
      )}
    </Root>
  );
};

export default Galleries;
