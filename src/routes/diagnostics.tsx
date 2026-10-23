import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/diagnostics")({
  beforeLoad: () => {
    throw notFound();
  },
});
