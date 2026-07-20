export const permissions = {
  organizationManage: 'organization.manage',
  accessManage: 'access.manage',
  tournamentManage: 'tournament.manage',
  teamManage: 'team.manage',
  rosterManage: 'roster.manage',
  rosterApprove: 'roster.approve',
  gameManage: 'game.manage',
  gameScore: 'game.score',
  standingManage: 'standing.manage',
  announcementManage: 'announcement.manage',
  auditRead: 'audit.read',
  exportCreate: 'export.create',
  mediaManage: 'media.manage',
  notificationManage: 'notification.manage',
} as const;

export type PermissionKey = (typeof permissions)[keyof typeof permissions];

export const systemRoles: readonly {
  key: string;
  name: string;
  scopeType: 'PLATFORM' | 'ORGANIZATION' | 'TOURNAMENT' | 'TEAM' | 'GAME';
  permissionKeys: readonly PermissionKey[];
}[] = [
  {
    key: 'platform-super-admin',
    name: 'Platform super administrator',
    scopeType: 'PLATFORM',
    permissionKeys: Object.values(permissions),
  },
  {
    key: 'organization-admin',
    name: 'Organization administrator',
    scopeType: 'ORGANIZATION',
    permissionKeys: Object.values(permissions).filter((key) => key !== permissions.gameScore),
  },
  {
    key: 'tournament-manager',
    name: 'Tournament manager',
    scopeType: 'TOURNAMENT',
    permissionKeys: [
      permissions.tournamentManage,
      permissions.rosterApprove,
      permissions.gameManage,
      permissions.standingManage,
      permissions.announcementManage,
      permissions.exportCreate,
      permissions.mediaManage,
      permissions.notificationManage,
    ],
  },
  {
    key: 'coach',
    name: 'Coach',
    scopeType: 'TEAM',
    permissionKeys: [permissions.teamManage, permissions.rosterManage, permissions.mediaManage],
  },
  {
    key: 'team-manager',
    name: 'Team manager',
    scopeType: 'TEAM',
    permissionKeys: [permissions.teamManage, permissions.rosterManage, permissions.mediaManage],
  },
  {
    key: 'scorekeeper',
    name: 'Scorekeeper',
    scopeType: 'GAME',
    permissionKeys: [permissions.gameScore],
  },
] as const;
