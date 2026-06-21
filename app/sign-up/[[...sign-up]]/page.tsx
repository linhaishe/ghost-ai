import { SignUp } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { afterAuthPath, clerkAppearance, signInPath, signUpRoutePath } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthPageShell
      title="Create your Ghost AI workspace."
      tagline="Start from a prompt, shape the architecture on canvas, and keep your team aligned."
    >
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl={afterAuthPath}
        forceRedirectUrl={afterAuthPath}
        path={signUpRoutePath}
        routing="path"
        signInUrl={signInPath}
      />
    </AuthPageShell>
  );
}
