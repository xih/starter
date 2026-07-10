import { ApiReference } from "@scalar/nextjs-api-reference";

export const runtime = "nodejs";

export const GET = ApiReference({
  spec: {
    url: "/api/openapi",
  },
  theme: "default",
});
