import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    // Never throw — just return null user when token is missing/invalid
    handleRequest(_err: any, user: any) {
        return user || null;
    }
}
