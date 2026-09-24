import { Suspense } from "react";
import { DeclarationsView } from "./DeclarationsView";

export default function DeclarationsPage() {
  return (
    <Suspense>
      <DeclarationsView />
    </Suspense>
  );
}
