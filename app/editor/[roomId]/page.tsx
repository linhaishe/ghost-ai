import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceShell } from "@/components/editor/editor-workspace-shell";
import { getCurrentProjectIdentity, getAccessibleProject } from "@/lib/project-access";
import { getEditorProjects } from "@/lib/project-data";

export default async function EditorWorkspacePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const [{ roomId }, identity] = await Promise.all([params, getCurrentProjectIdentity()]);

  if (!identity) {
    redirect("/sign-in");
  }

  const [project, { ownedProjects, sharedProjects }] = await Promise.all([
    getAccessibleProject(roomId, identity),
    getEditorProjects(),
  ]);

  if (!project) {
    return <AccessDenied />;
  }

  return (
    <EditorWorkspaceShell
      roomId={roomId}
      projectName={project.name}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
