import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '@tournament/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { permissions } from '../authorization/permissions';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  acceptInvitationSchema,
  assignRoleSchema,
  createInvitationSchema,
} from './invitations.schemas';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations and access management')
@Controller()
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('organizations/:organizationId/invitations')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.accessManage)
  create(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(createInvitationSchema))
    body: ReturnType<typeof createInvitationSchema.parse>,
  ) {
    return this.invitations.create(organizationId, actor.userId, body);
  }

  @Post('invitations/accept')
  accept(
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(acceptInvitationSchema))
    body: ReturnType<typeof acceptInvitationSchema.parse>,
  ) {
    return this.invitations.accept(actor.userId, body.token);
  }

  @Post('organizations/:organizationId/role-assignments')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.accessManage)
  assign(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(assignRoleSchema)) body: ReturnType<typeof assignRoleSchema.parse>,
  ) {
    return this.invitations.assign(organizationId, body);
  }
}
