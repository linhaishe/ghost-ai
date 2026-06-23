import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { EditorProject } from "@/components/editor/project-types";

function toEditorProject(
  project: { id: string; name: string },
  ownerType: EditorProject["ownerType"],
): EditorProject {
  return {
    id: project.id,
    name: project.name,
    slug: project.id,
    ownerType,
  };
}

export async function getEditorProjects() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return {
      ownedProjects: [],
      sharedProjects: [],
    };
  }

  const user = await currentUser();
  const emailAddresses = user?.emailAddresses.map((email) => email.emailAddress) ?? [];

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    emailAddresses.length > 0
      ? prisma.project.findMany({
          where: {
            ownerId: {
              not: userId,
            },
            collaborators: {
              some: {
                email: {
                  in: emailAddresses,
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [],
  ]);

  return {
    ownedProjects: ownedProjects.map((project) => toEditorProject(project, "owned")),
    sharedProjects: sharedProjects.map((project) => toEditorProject(project, "shared")),
  };
}
