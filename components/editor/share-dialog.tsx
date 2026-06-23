"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Copy, Trash2, UserPlus } from "lucide-react";

import { EditorDialogContent } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

type ProjectRole = "owner" | "collaborator";

const COPY_FEEDBACK_MS = 1400;

export function ShareDialog({ isOpen, projectId, projectName, onClose }: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [copied, setCopied] = useState(false);

  const projectLink = useMemo(() => {
    if (typeof window === "undefined") {
      return `/editor/${projectId}`;
    }

    return `${window.location.origin}/editor/${projectId}`;
  }, [projectId]);

  const canManageAccess = role === "owner";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCurrent = true;

    async function loadCollaborators() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/projects/${projectId}/collaborators`);

        if (!response.ok) {
          throw new Error("Failed to load collaborators.");
        }

        const data = (await response.json()) as {
          role: ProjectRole;
          collaborators: Collaborator[];
        };

        if (isCurrent) {
          setRole(data.role);
          setCollaborators(data.collaborators);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadCollaborators();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !canManageAccess || isMutating) {
      return;
    }

    setIsMutating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to invite collaborator.");
      }

      setEmail("");

      const listResponse = await fetch(`/api/projects/${projectId}/collaborators`);
      const data = (await listResponse.json()) as {
        role: ProjectRole;
        collaborators: Collaborator[];
      };
      setRole(data.role);
      setCollaborators(data.collaborators);
    } finally {
      setIsMutating(false);
    }
  }

  async function removeCollaborator(collaborator: Collaborator) {
    if (!canManageAccess || isMutating) {
      return;
    }

    setIsMutating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: collaborator.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove collaborator.");
      }

      setCollaborators((current) =>
        current.filter((item) => item.email !== collaborator.email),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function copyProjectLink() {
    await navigator.clipboard.writeText(projectLink);
    setCopied(true);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <EditorDialogContent
        title="Share Project"
        description={`Manage access for ${projectName}.`}
        footerActions={
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-copy-secondary" htmlFor="project-link">
              Project link
            </label>
            <div className="flex gap-2">
              <Input id="project-link" value={projectLink} readOnly className="text-copy-primary" />
              <Button type="button" variant="outline" onClick={copyProjectLink}>
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {canManageAccess ? (
            <form className="space-y-2" onSubmit={inviteCollaborator}>
              <label className="text-sm font-medium text-copy-secondary" htmlFor="collaborator-email">
                Invite collaborator
              </label>
              <div className="flex gap-2">
                <Input
                  id="collaborator-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  className="text-copy-primary"
                />
                <Button type="submit" disabled={isMutating || !email.trim()}>
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-surface-border bg-subtle px-3 py-2 text-sm text-copy-muted">
              You can view collaborators, but only the owner can manage project access.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-copy-primary">Collaborators</h3>
              <p className="mt-1 text-sm text-copy-muted">
                People with access to this project.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-surface-border bg-subtle px-4 py-5 text-sm text-copy-muted">
                Loading collaborators...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border bg-subtle/50 px-4 py-5 text-sm text-copy-muted">
                No collaborators invited yet.
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-subtle/50 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-elevated text-sm font-semibold text-copy-secondary">
                        {collaborator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            src={collaborator.avatarUrl}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          collaborator.displayName.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-copy-primary">
                          {collaborator.displayName}
                        </p>
                        <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>
                      </div>
                    </div>

                    {canManageAccess ? (
                      <Button
                        aria-label={`Remove ${collaborator.email}`}
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={isMutating}
                        onClick={() => void removeCollaborator(collaborator)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </EditorDialogContent>
    </Dialog>
  );
}
