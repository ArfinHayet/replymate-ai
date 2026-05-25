import { SetMetadata } from "@nestjs/common";
import type { ContentLimitResource } from "./usage.service";

export const CONTENT_LIMIT_RESOURCE_KEY = "content_limit_resource";

export const CheckContentLimit = (resource: ContentLimitResource) =>
  SetMetadata(CONTENT_LIMIT_RESOURCE_KEY, resource);
