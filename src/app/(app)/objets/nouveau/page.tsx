import { Suspense } from "react";
import { NewObjectView } from "./NewObjectView";

export default function NouvelObjetPage() {
  return (
    <Suspense>
      <NewObjectView />
    </Suspense>
  );
}
