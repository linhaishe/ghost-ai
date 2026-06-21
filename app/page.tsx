import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { afterAuthPath, signInPath } from "@/lib/clerk-appearance";

export default async function Home() {
  const { userId } = await auth();

  redirect(userId ? afterAuthPath : signInPath);
}
