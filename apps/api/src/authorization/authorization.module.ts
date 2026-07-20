import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PermissionGuard } from './permission.guard';
import { SuperAdminGuard } from './super-admin.guard';

@Global()
@Module({
  providers: [AuthorizationService, PermissionGuard, SuperAdminGuard],
  exports: [AuthorizationService, PermissionGuard, SuperAdminGuard],
})
export class AuthorizationModule {}
