import { SignIn } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { afterAuthPath, clerkAppearance, signInRoutePath, signUpPath } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <AuthPageShell
      title="Sign in to your architecture workspace."
      tagline="Map system ideas, refine them with collaborators, and keep the design process moving."
    >
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl={afterAuthPath}
        forceRedirectUrl={afterAuthPath}
        path={signInRoutePath}
        routing="path"
        signUpUrl={signUpPath}
      />
    </AuthPageShell>
  );
}
