import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarPickerProps = {
  src: string;
  name: string;
};

type Props = {
  avatars: readonly AvatarPickerProps[];
  avatarSrc: string;
  setAvatarSrc: (src: string) => void;
  /** Optional accent color (any valid CSS color). Falls back to the theme's primary token. */
  primaryColor?: string;
};

const AvatarSelector = ({
  avatars,
  avatarSrc,
  setAvatarSrc,
  primaryColor,
}: Props) => {
  const inlineAvatars = avatars.slice(0, 4);
  const overflowAvatars = avatars.slice(4);
  const activeInOverflow = overflowAvatars.some((a) => a.src === avatarSrc);
  const activeOverflowAvatar = overflowAvatars.find((a) => a.src === avatarSrc);

  const accent = primaryColor ?? "hsl(var(--primary))";

  const renderAvatarSwatch = (a: AvatarPickerProps) => {
    const active = avatarSrc === a.src;
    return (
      <button
        key={a.src}
        type="button"
        onClick={() => setAvatarSrc(a.src)}
        aria-label={`Choose ${a.name}`}
        aria-pressed={active}
        title={a.name}
        className={cn(
          "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          "bg-muted ring-offset-2 ring-offset-background transition-all duration-200",
          "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "ring-2" : "ring-1 ring-border"
        )}
        style={
          active
            ? ({ ["--tw-ring-color"]: accent } as React.CSSProperties)
            : undefined
        }
      >
        <img
          src={a.src}
          alt={a.name}
          className="h-8 w-8 rounded-full object-cover"
          loading="lazy"
        />
        {active && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Avatar</label>
        <span className="text-xs text-muted-foreground">
          {avatars.length} options
        </span>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5",
          "shadow-sm transition-colors"
        )}
      >
        {inlineAvatars.map(renderAvatarSwatch)}

        {overflowAvatars.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Show more avatars"
                className={cn(
                  "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  "bg-muted text-muted-foreground",
                  "ring-1 ring-border ring-offset-2 ring-offset-background transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeInOverflow && "ring-2"
                )}
                style={
                  activeInOverflow
                    ? ({ ["--tw-ring-color"]: accent } as React.CSSProperties)
                    : undefined
                }
              >
                {activeInOverflow && activeOverflowAvatar ? (
                  <img
                    src={activeOverflowAvatar.src}
                    alt={activeOverflowAvatar.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-foreground">
                    +{overflowAvatars.length}
                  </span>
                )}
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-foreground"
                  aria-hidden
                >
                  <ChevronDown className="h-2.5 w-2.5 text-background" />
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-72 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  More avatars
                </p>
                <span className="text-xs text-muted-foreground">
                  {overflowAvatars.length}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {overflowAvatars.map(renderAvatarSwatch)}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default AvatarSelector;