import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress - Shadow Rise Fitness" },
      { name: "description", content: "Your account’s XP, cosmetic level and recorded fitness sessions." },
      { property: "og:title", content: "Player Progress - Shadow Rise Fitness" },
      { property: "og:description", content: "Your account’s XP, cosmetic level and recorded fitness sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: fitCss }],
  }),
  component: Page,
});

function Page() {
  return (
    <ClientOnly fallback={<main className="sys" />}>
      <Suspense fallback={<main className="sys" />}>
        <App page="progress" />
      </Suspense>
    </ClientOnly>
  );
}
