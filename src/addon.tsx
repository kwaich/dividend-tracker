import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { AddonEnableFunction } from "@wealthfolio/addon-sdk";
import { createRoot, type Root } from "react-dom/client";
import DividendPage from "./pages/dividend-page";

const enable: AddonEnableFunction = (context) => {
  context.api.logger.info("Dividends Importer addon is being enabled!");

  const addedItems: { remove: () => void }[] = [];
  let root: Root | null = null;

  try {
    const sidebarItem = context.sidebar.addItem({
      id: "dividend-tracker",
      label: "Dividends Importer",
      icon: "receipt",
      route: "/addons/dividend-tracker",
      order: 160,
    });
    addedItems.push(sidebarItem);

    context.router.add({
      path: "/addons/dividend-tracker",
      render: ({ root: routeRoot }) => {
        root ??= createRoot(routeRoot);
        const queryClient = context.api.query.getClient() as QueryClient;

        root.render(
          <QueryClientProvider client={queryClient}>
            <DividendPage ctx={context} />
          </QueryClientProvider>,
        );
      },
    });

    context.api.logger.info("Dividends Importer addon enabled successfully");
  } catch (error) {
    context.api.logger.error(
      "Failed to initialize addon: " + (error as Error).message,
    );
    throw error;
  }

  context.onDisable(() => {
    context.api.logger.info("Dividends Importer addon is being disabled");
    addedItems.forEach((item) => {
      try {
        item.remove();
      } catch (error) {
        context.api.logger.error(
          "Error removing sidebar item: " + (error as Error).message,
        );
      }
    });
    root?.unmount();
    root = null;
  });
};

export default enable;
