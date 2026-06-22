import { EditorShell } from "@/components/editor/editor-shell";
import { getEditorProjects } from "@/lib/project-data";

export default async function EditorPage() {
  const { ownedProjects, sharedProjects } = await getEditorProjects();

  return <EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects} />;
}
