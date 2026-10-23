import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/read")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
