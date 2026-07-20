import { randomUUID } from 'node:crypto';
import { argon2id, hash } from 'argon2';
import { PrismaClient } from '../generated/client';
import { bootstrapArgumentsSchema } from '../src/management/management.schemas';
import { permissions, systemRoles } from '../src/authorization/permissions';

function readArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const input = bootstrapArgumentsSchema.parse({
    email: readArgument('email') ?? process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: readArgument('password') ?? process.env.BOOTSTRAP_ADMIN_PASSWORD,
    displayName: readArgument('display-name') ?? process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME,
    organizationName: readArgument('organization-name') ?? process.env.BOOTSTRAP_ORGANIZATION_NAME,
    organizationSlug: readArgument('organization-slug') ?? process.env.BOOTSTRAP_ORGANIZATION_SLUG,
  });
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
      throw new Error(
        'A user with that email already exists; bootstrap is intentionally not an update command',
      );
    if (await prisma.organization.findUnique({ where: { slug: input.organizationSlug } })) {
      throw new Error(
        'An organization with that slug already exists; bootstrap is intentionally not an update command',
      );
    }
    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    });
    await prisma.$transaction(async (transaction) => {
      for (const [key, description] of Object.entries({
        [permissions.organizationManage]: 'Manage organization configuration',
        [permissions.accessManage]: 'Manage user access and role assignments',
        [permissions.tournamentManage]: 'Manage tournaments and competition structure',
        [permissions.teamManage]: 'Manage an assigned team',
        [permissions.rosterManage]: 'Manage and submit an assigned team roster',
        [permissions.rosterApprove]: 'Review and decide roster submissions',
        [permissions.gameManage]: 'Manage fixtures and game state',
        [permissions.gameScore]: 'Operate an assigned live game',
        [permissions.standingManage]: 'Recalculate and override standings',
        [permissions.announcementManage]: 'Manage announcements',
        [permissions.auditRead]: 'Review audit records',
        [permissions.exportCreate]: 'Create authorized data exports',
        [permissions.mediaManage]: 'Manage tenant media',
        [permissions.notificationManage]: 'Schedule notifications',
      })) {
        await transaction.permission.upsert({
          where: { key },
          create: { key, description },
          update: { description },
        });
      }
      for (const roleDefinition of systemRoles) {
        const role = await transaction.role.upsert({
          where: { key: roleDefinition.key },
          create: {
            key: roleDefinition.key,
            name: roleDefinition.name,
            scopeType: roleDefinition.scopeType,
            system: true,
          },
          update: { name: roleDefinition.name, scopeType: roleDefinition.scopeType, system: true },
        });
        const permissionRows = await transaction.permission.findMany({
          where: { key: { in: [...roleDefinition.permissionKeys] } },
        });
        await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
        await transaction.rolePermission.createMany({
          data: permissionRows.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        });
      }
      const user = await transaction.user.create({
        data: {
          email: input.email,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          platformSuperAdmin: true,
          profile: { create: { displayName: input.displayName } },
        },
      });
      const organization = await transaction.organization.create({
        data: { name: input.organizationName, slug: input.organizationSlug },
      });
      const membership = await transaction.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
      const organizationAdminRole = await transaction.role.findUniqueOrThrow({
        where: { key: 'organization-admin' },
      });
      await transaction.membershipRole.create({
        data: { membershipId: membership.id, roleId: organizationAdminRole.id },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          correlationId: randomUUID(),
          action: 'platform.bootstrap-admin',
          resourceType: 'User',
          resourceId: user.id,
          outcome: 'SUCCESS',
          metadata: { source: 'explicit-cli', organizationSlug: organization.slug },
        },
      });
    });
    process.stdout.write('Platform administrator created successfully.\n');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Bootstrap failed'}\n`);
  process.exitCode = 1;
});
