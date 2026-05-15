import type { AddonContext } from "@wealthfolio/addon-sdk";
import { Page, PageContent, PageHeader } from "@wealthfolio/ui";
import DividendSuggestions from "../components/suggestions";

interface DividendPageProps {
  ctx: AddonContext;
}

export default function DividendPage({ ctx }: DividendPageProps) {
  return (
    <Page>
      <PageHeader heading="Dividends Importer" />
      <PageContent>
        <DividendSuggestions ctx={ctx} />
      </PageContent>
    </Page>
  );
}
