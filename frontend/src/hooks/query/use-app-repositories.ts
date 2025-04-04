import { useInfiniteQuery } from "@tanstack/react-query";
import React from "react";
import { retrieveGitHubAppRepositories } from "#/api/git";
import { useAppInstallations } from "./use-app-installations";
import { useConfig } from "./use-config";
import { useAuth } from "#/context/auth-context";

export const useAppRepositories = () => {
  const { providersAreSet } = useAuth();
  const { data: config } = useConfig();
  const { data: installations } = useAppInstallations();

  const repos = useInfiniteQuery({
    queryKey: ["repositories", providersAreSet, installations],
    queryFn: async ({
      pageParam,
    }: {
      pageParam: { installationIndex: number | null; repoPage: number | null };
    }) => {
      const { repoPage, installationIndex } = pageParam;

      if (!installations) {
        throw new Error("Missing installation list");
      }

      return retrieveGitHubAppRepositories(
        installationIndex || 0,
        installations,
        repoPage || 1,
        30,
      );
    },
    initialPageParam: { installationIndex: 0, repoPage: 1 },
    getNextPageParam: (lastPage) => {
      if (lastPage.nextPage) {
        return {
          installationIndex: lastPage.installationIndex,
          repoPage: lastPage.nextPage,
        };
      }

      if (lastPage.installationIndex !== null) {
        return { installationIndex: lastPage.installationIndex, repoPage: 1 };
      }

      return null;
    },
    enabled:
      providersAreSet &&
      Array.isArray(installations) &&
      installations.length > 0 &&
      config?.APP_MODE === "saas",
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  // TODO: Once we create our custom dropdown component, we should fetch data onEndReached
  // (nextui autocomplete doesn't support onEndReached nor is it compatible for extending)
  const { isSuccess, isFetchingNextPage, hasNextPage, fetchNextPage } = repos;
  React.useEffect(() => {
    if (!isFetchingNextPage && isSuccess && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, isSuccess, hasNextPage, fetchNextPage]);

  return repos;
};
