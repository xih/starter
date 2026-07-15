import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    LIVEKIT_URL: z.string().url().optional(),
    LIVEKIT_API_KEY: z.string().optional(),
    LIVEKIT_API_SECRET: z.string().optional(),
    LIVEKIT_AGENT_NAME: z.string().optional(),
    LIVEKIT_AGENT_REALTIME_MODEL: z.string().optional(),
    LIVEKIT_ALLOWED_ORIGINS: z.string().optional(),
    LIVEKIT_TOKEN_AUTH_SECRET: z.string().optional(),
    CARTESIA_API_KEY: z.string().optional(),
    PERSONA_ADMIN_SECRET: z.string().optional(),
    PERSONA_AGENT_READ_SECRET: z.string().optional(),
    LIVEKIT_GUEST_RATE_LIMIT_SALT: z.string().optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
    QSTASH_TOKEN: z.string().optional(),
    QSTASH_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    // AUTH_DISCORD_ID: z.string(),
    // AUTH_DISCORD_SECRET: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_LIVEKIT_AGENT_NAME: z.string().optional(),
    NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT: z.string().optional(),
    NEXT_PUBLIC_LIVEKIT_PROJECT_ENV: z.string().optional(),
    NEXT_PUBLIC_STORYBOOK_ORIGIN: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME,
    LIVEKIT_AGENT_REALTIME_MODEL: process.env.LIVEKIT_AGENT_REALTIME_MODEL,
    LIVEKIT_ALLOWED_ORIGINS: process.env.LIVEKIT_ALLOWED_ORIGINS,
    LIVEKIT_TOKEN_AUTH_SECRET: process.env.LIVEKIT_TOKEN_AUTH_SECRET,
    CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
    PERSONA_ADMIN_SECRET: process.env.PERSONA_ADMIN_SECRET,
    PERSONA_AGENT_READ_SECRET: process.env.PERSONA_AGENT_READ_SECRET,
    LIVEKIT_GUEST_RATE_LIMIT_SALT: process.env.LIVEKIT_GUEST_RATE_LIMIT_SALT,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_URL: process.env.QSTASH_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    // AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    // AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_LIVEKIT_AGENT_NAME: process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME,
    NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT:
      process.env.NEXT_PUBLIC_LIVEKIT_TOKEN_ENDPOINT,
    NEXT_PUBLIC_LIVEKIT_PROJECT_ENV:
      process.env.NEXT_PUBLIC_LIVEKIT_PROJECT_ENV,
    NEXT_PUBLIC_STORYBOOK_ORIGIN: process.env.NEXT_PUBLIC_STORYBOOK_ORIGIN,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
