import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class GlobalPasswordGuard implements CanActivate {
  private readonly requiredPassword: string;

  constructor() {
    // Read the password from environment variable
    // Ensure that 'API_PASSWORD' is available to the running process
    this.requiredPassword = process.env.API_PASSWORD;
  }

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();

    // For example, check a header called 'x-api-password'
    const providedPassword = request.header('x-api-password');

    if (!providedPassword || providedPassword !== this.requiredPassword) {
      throw new ForbiddenException('Invalid password provided.');
    }

    return true; // If password matches, allow the request
  }
}
