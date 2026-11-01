import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import fitCss from "../fitrpg/ui/style.css?url";

const App = lazy(() => import("../fitrpg/ui/App"));

export const Route = createFileRoute("/hunter")({
  head: () => ({
    meta: [
      { title: "Hunter - Shadow Rise Fitness" },
      { name: "description", content: "Honest readiness registry of approved and unavailable level artwork." },
      { property: "og:title", content: "Rank Registry - Shadow Rise Fitness" },
      { property: "og:description", content: "Honest readiness registry of approved and unavailable level artwork." },
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
        <App page="hunter" />
      </Suspense>
    </ClientOnly>
  );
}
