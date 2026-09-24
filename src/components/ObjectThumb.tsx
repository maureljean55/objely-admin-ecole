import { Icon } from "@/components/ui/Icon";
import { categoryIcon, type CategoryId } from "@/lib/types";

/** Photo, or the category icon when there is none. */
export function ObjectThumb({ photo, category, name, size = 44 }: { photo?: string; category: CategoryId; name: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-field border border-line bg-canvas" style={{ width: size, height: size }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} className="size-full object-contain p-1" />
      ) : (
        <Icon name={categoryIcon(category)} size={Math.round(size * 0.5)} className="text-mute" />
      )}
    </span>
  );
}
