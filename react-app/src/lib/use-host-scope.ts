import { useQuery } from "@tanstack/react-query";

import GalleryModel, { type Gallery } from "../models/GalleryModel";
import galleryService from "../services/galleries";
import { useUserStore } from "../stores";
import { galleriesForHost } from "./host-scope";

interface HostScope {
  isReady: boolean;
  isHostScoped: boolean;
  scopedGalleryIds: string[];
}

// Read the SPA's host-scope: galleries whose `hostname` regex
// matches `window.location.hostname`. An empty match set means the
// primary (unscoped) host — every accessible gallery is reachable
// and global Manage surfaces apply. A non-empty set scopes the SPA
// to those galleries; global Manage / Stats surfaces should hide
// because their endpoints are 404'd by the server-side
// `requireUnscoped` guard.
export const useHostScope = (): HostScope => {
  const user = useUserStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["galleries", user?.id ?? null],
    queryFn: async () => {
      const raw = await galleryService.getAll();
      return raw
        .map((gallery) => GalleryModel(gallery))
        .filter((g): g is Gallery => !!g);
    },
  });
  const galleries = data ?? [];
  const scoped = galleriesForHost(galleries, window.location.hostname);
  return {
    isReady: !isLoading,
    isHostScoped: scoped.length > 0,
    scopedGalleryIds: scoped.map((g) => g.id()),
  };
};
