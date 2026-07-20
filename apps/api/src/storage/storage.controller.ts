import { Body, ConflictException, Controller, Param, Post, UseGuards } from '@nestjs/common';
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
  completeUploadSchema,
  replaceTeamLogoSchema,
  requestUploadSchema,
} from './storage.schemas';
import { StorageService } from './storage.service';

@ApiTags('media')
@Controller('organizations/:organizationId/media')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(permissions.mediaManage)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload-requests')
  requestUpload(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(requestUploadSchema))
    body: ReturnType<typeof requestUploadSchema.parse>,
  ) {
    return this.storage.requestUpload(organizationId, actor.userId, body);
  }

  @Post('upload-completions')
  completeUpload(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(completeUploadSchema))
    body: ReturnType<typeof completeUploadSchema.parse>,
  ) {
    return this.storage.completeUpload(organizationId, body.assetId, body.checksum, actor.userId);
  }

  @Post('teams/:teamId/upload-requests')
  requestTeamLogoUpload(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(requestUploadSchema))
    body: ReturnType<typeof requestUploadSchema.parse>,
  ) {
    if (body.purpose !== 'TEAM_LOGO') {
      throw new ConflictException({
        code: 'INVALID_MEDIA_PURPOSE',
        message: 'Team-scoped uploads are limited to team logos',
      });
    }
    return this.storage.requestUpload(organizationId, actor.userId, body);
  }

  @Post('teams/:teamId/upload-completions')
  completeTeamLogoUpload(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(completeUploadSchema))
    body: ReturnType<typeof completeUploadSchema.parse>,
  ) {
    return this.storage.completeUpload(organizationId, body.assetId, body.checksum, actor.userId);
  }

  @Post('teams/:teamId/logo')
  replaceTeamLogo(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Body(new ZodValidationPipe(replaceTeamLogoSchema))
    body: ReturnType<typeof replaceTeamLogoSchema.parse>,
  ) {
    return this.storage.replaceTeamLogo(
      organizationId,
      teamId,
      body.assetId,
      body.expectedTeamVersion,
    );
  }
}
