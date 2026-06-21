import type { Appearance } from "@clerk/ui";
import { dark } from "@clerk/ui/themes";

export const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    colorForeground: "var(--text-primary)",
    colorMuted: "var(--bg-subtle)",
    colorMutedForeground: "var(--text-muted)",
    colorBackground: "var(--bg-elevated)",
    colorInput: "var(--bg-subtle)",
    colorInputForeground: "var(--text-primary)",
    colorRing: "var(--accent-primary)",
    colorBorder: "var(--border-default)",
    colorModalBackdrop: "var(--bg-base)",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
    fontFamilyMono: "var(--font-geist-mono)",
    borderRadius: "var(--radius)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    card: "border border-surface-border bg-elevated shadow-2xl",
    headerTitle: "text-copy-primary",
    headerSubtitle: "text-copy-muted",
    socialButtonsBlockButton: "border-surface-border bg-subtle text-copy-primary",
    formFieldInput: "border-surface-border bg-subtle text-copy-primary",
    footerActionLink: "text-brand",
  },
} satisfies Appearance;

function pathnameFromUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value).pathname;
  }

  return value;
}

export const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
export const signUpPath = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";
export const signInRoutePath = pathnameFromUrl(signInPath);
export const signUpRoutePath = pathnameFromUrl(signUpPath);
export const afterAuthPath = "/editor";
