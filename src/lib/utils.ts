import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the design-system type scale, so "text-body-md" is a size (not a color)
// and a className passed to a component overrides its default instead of fighting it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-hero",
        "display-hero-mobile",
        "headline-lg",
        "headline-md",
        "headline-sm",
        "body-lg",
        "body-md",
        "body-sm",
        "label-lg",
        "label-md",
        "label-sm",
        "numeric-metric",
        "numeric-data",
      ],
    },
  },
});

export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
