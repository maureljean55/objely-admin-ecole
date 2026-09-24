import { Suspense } from "react";
import { ObjectsView } from "./ObjectsView";

export default function ObjetsPage() {
  return (
    <Suspense>
      <ObjectsView />
    </Suspense>
  );
}
