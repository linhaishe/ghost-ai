import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface CurrentProjectIdentity {
  userId: string;
  primaryEmail: string | null;
}

export async function getCurrentProjectIdentity() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  const user = await currentUser();
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  return {
    userId,
    primaryEmail,
  };
}

export async function getAccessibleProject(roomId: string, identity: CurrentProjectIdentity) {
  return prisma.project.findFirst({
    where: {
      id: roomId,
      OR: [
        {
          ownerId: identity.userId,
        },
        ...(identity.primaryEmail
          ? [
              {
                collaborators: {
                  some: {
                    email: identity.primaryEmail,
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });
}

export async function getProjectAccessRole(roomId: string, identity: CurrentProjectIdentity) {
  const project = await prisma.project.findUnique({
    where: {
      id: roomId,
    },
    select: {
      id: true,
      ownerId: true,
      collaborators: {
        where: identity.primaryEmail
          ? {
              email: identity.primaryEmail,
            }
          : {
              email: "__no_email__",
            },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === identity.userId) {
    return "owner" as const;
  }

  if (project.collaborators.length > 0) {
    return "collaborator" as const;
  }

  return null;
}
