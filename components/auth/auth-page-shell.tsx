import type { ReactNode } from "react";
import { FileText, Network, Sparkles } from "lucide-react";

interface AuthPageShellProps {
  title: string;
  tagline: string;
  children: ReactNode;
}

const features = [
  {
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
    icon: Sparkles,
  },
  {
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
    icon: Network,
  },
  {
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
    icon: FileText,
  },
];

export function AuthPageShell({ title, tagline, children }: AuthPageShellProps) {
  return (
    <main className="grid min-h-dvh bg-base text-copy-primary lg:grid-cols-2">
      <section className="hidden border-r border-surface-border bg-surface px-14 py-12 lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/20">
              <span className="sr-only">Ghost AI</span>
            </div>
            <div className="text-lg font-semibold tracking-tight text-copy-primary">Ghost AI</div>
          </div>

          <div className="mt-36 max-w-2xl">
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-copy-primary">
              {title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-copy-muted">
              {tagline}
            </p>

            <ul className="mt-16 space-y-9">
              {features.map(({ title: featureTitle, description, icon: Icon }) => (
                <li key={featureTitle} className="flex gap-6">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-accent-dim text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-copy-secondary">{featureTitle}</h2>
                    <p className="mt-2 max-w-xl text-base leading-7 text-copy-muted">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm font-medium text-copy-faint">© 2026 Ghost AI. All rights reserved.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
