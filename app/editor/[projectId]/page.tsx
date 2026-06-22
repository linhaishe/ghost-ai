import { EditorShell } from "@/components/editor/editor-shell";
import { getEditorProjects } from "@/lib/project-data";

export default async function EditorWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [{ projectId }, { ownedProjects, sharedProjects }] = await Promise.all([
    params,
    getEditorProjects(),
  ]);

  return (
    <EditorShell
      activeProjectId={projectId}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
