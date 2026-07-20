export type NavigationItem = { href: string; label: string; permission: string };

export const portalNavigation: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'Overview', permission: 'organization.manage' },
  { href: '/competitions', label: 'Competitions', permission: 'tournament.manage' },
  { href: '/teams', label: 'Teams & rosters', permission: 'team.manage' },
  { href: '/games', label: 'Games', permission: 'game.manage' },
  { href: '/live-scoring', label: 'Live scoring', permission: 'game.score' },
  { href: '/roster-review', label: 'Roster review', permission: 'roster.approve' },
  { href: '/requests', label: 'Applications & corrections', permission: 'tournament.manage' },
  { href: '/announcements', label: 'Announcements', permission: 'announcement.manage' },
  { href: '/exports', label: 'Exports', permission: 'export.create' },
  { href: '/audit', label: 'Audit', permission: 'audit.read' },
] as const;

export function visibleNavigation(
  permissions: ReadonlySet<string>,
  platformSuperAdmin: boolean,
): readonly NavigationItem[] {
  return portalNavigation.filter((item) => platformSuperAdmin || permissions.has(item.permission));
}
