import {
  CanActivate,
  ExecutionContext,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  CONTENT_LIMIT_RESOURCE_KEY
} from "./content-limit.decorator";
import {
  ContentLimitResource,
  UsageService
} from "./usage.service";

@Injectable()
export class ContentLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: UsageService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<ContentLimitResource>(
      CONTENT_LIMIT_RESOURCE_KEY,
      context.getHandler()
    );

    if (!resource) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request.user as { id?: string } | undefined)?.id;
    if (!userId) return false;

    await this.usageService.assertCanAddContent(
      userId,
      resource,
      this.getRequestedCount(resource, request)
    );

    return true;
  }

  private getRequestedCount(resource: ContentLimitResource, request: Request) {
    if (resource !== "webPages") return 1;

    const body = request.body as { urls?: unknown } | undefined;
    if (!Array.isArray(body?.urls)) return 1;

    return body.urls.filter(
      (url) => typeof url === "string" && url.trim().length > 0
    ).length;
  }
}
