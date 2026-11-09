import { createFileRoute } from "@tanstack/react-router";
import { Ledger } from "@/components/ledger";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Ledger />;
}
