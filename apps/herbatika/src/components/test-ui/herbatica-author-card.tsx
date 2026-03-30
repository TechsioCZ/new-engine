import { Image } from "@techsio/ui-kit/atoms/image";

type HerbaticaAuthorCardProps = {
  author: string;
  authorRole: string;
  bio: string;
  imageSrc?: string;
};

export function HerbaticaAuthorCard({
  author,
  authorRole,
  bio,
  imageSrc = "/photos/image.png",
}: HerbaticaAuthorCardProps) {
  return (
    <section className="flex flex-col gap-300 rounded-2xl border border-border-secondary bg-surface p-400 sm:flex-row sm:items-center">
      <Image
        alt={author}
        className="h-850 w-850 rounded-xl object-cover"
        height={200}
        src={imageSrc}
        width={200}
      />

      <div className="space-y-150">
        <p className="text-xs leading-normal text-fg-secondary">{authorRole}</p>
        <h3 className="text-xl leading-tight font-bold text-fg-primary">
          {author}
        </h3>
        <p className="text-sm leading-relaxed text-fg-secondary">{bio}</p>
      </div>
    </section>
  );
}
