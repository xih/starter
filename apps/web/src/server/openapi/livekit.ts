export const liveKitOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Starter LiveKit API",
    version: "0.1.0",
    description:
      "LiveKit token, guest session, and QStash cleanup endpoints for the portfolio voice agent.",
  },
  servers: [
    {
      url: "https://starter-three-sepia.vercel.app",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
  ],
  paths: {
    "/api/livekit/guest-session": {
      post: {
        summary: "Create a 30-second guest LiveKit session",
        description:
          "Public endpoint for one-time guest trials. The server generates room, participant identity, and agent dispatch values; caller-supplied LiveKit fields are ignored.",
        tags: ["LiveKit Guest Sessions"],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
                description:
                  "Body is accepted for client compatibility, but room/agent/participant fields are ignored.",
              },
              examples: {
                empty: {
                  value: {},
                },
                ignoredCallerValues: {
                  value: {
                    room_name: "ignored",
                    participant_identity: "ignored",
                    room_config: {
                      agents: [{ agentName: "ignored" }],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Guest LiveKit token issued",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GuestSessionTokenResponse",
                },
              },
            },
          },
          "403": {
            description: "Origin is not allowlisted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "A guest session is already active",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "429": {
            description: "Guest trial has already been used",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "LiveKit/Upstash/QStash environment is not configured",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      options: {
        summary: "Guest session CORS preflight",
        tags: ["LiveKit Guest Sessions"],
        responses: {
          "204": { description: "Origin accepted" },
          "403": { description: "Origin rejected" },
        },
      },
    },
    "/api/livekit/guest-session/expire": {
      post: {
        summary: "Expire a guest LiveKit session",
        description:
          "QStash-only callback. Verifies the QStash signature, deletes the LiveKit room, marks the Redis session expired, and releases the active-session lock.",
        tags: ["LiveKit Guest Sessions"],
        security: [{ qstashSignature: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["session_id"],
                properties: {
                  session_id: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session expired, missing, or already expired",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["expired", "missing", "already_expired"],
                    },
                    room_name: { type: "string" },
                  },
                  required: ["status"],
                },
              },
            },
          },
          "400": {
            description: "Invalid request body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "QStash signature verification failed",
          },
        },
      },
    },
    "/api/livekit/token": {
      post: {
        summary: "Issue protected QA/admin LiveKit token",
        description:
          "Protected diagnostics endpoint. Requires LIVEKIT_TOKEN_AUTH_SECRET in production and must not be used as the public guest path.",
        tags: ["LiveKit Admin Diagnostics"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dispatch_agent: { type: "boolean" },
                  room_name: { type: "string" },
                  participant_identity: { type: "string" },
                  participant_name: { type: "string" },
                  participant_metadata: { type: "string" },
                  participant_attributes: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                  room_config: {
                    type: "object",
                    properties: {
                      agents: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            agentName: { type: "string" },
                            agent_name: { type: "string" },
                            metadata: { type: "string" },
                            agent_metadata: { type: "string" },
                            deployment: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "LiveKit token issued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminTokenResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid diagnostics secret",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
      qstashSignature: {
        type: "apiKey",
        in: "header",
        name: "Upstash-Signature",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          signup_url: { type: "string" },
          issues: { type: "array", items: { type: "object" } },
        },
        required: ["error"],
      },
      GuestSessionTokenResponse: {
        type: "object",
        required: [
          "server_url",
          "participant_token",
          "session_id",
          "room_name",
          "expires_at",
          "duration_seconds",
          "cleanup_enabled",
          "signup_url",
          "agent_dispatch_mode",
          "agent_dispatch_names",
        ],
        properties: {
          server_url: { type: "string", format: "uri" },
          participant_token: { type: "string" },
          session_id: { type: "string" },
          room_name: { type: "string" },
          expires_at: { type: "string", format: "date-time" },
          duration_seconds: { type: "number", enum: [30] },
          cleanup_enabled: { type: "boolean" },
          signup_url: { type: "string" },
          agent_dispatch_mode: {
            type: "string",
            enum: ["token_room_config"],
          },
          agent_dispatch_names: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      AdminTokenResponse: {
        type: "object",
        required: [
          "server_url",
          "participant_token",
          "agent_dispatch_mode",
          "agent_dispatch_names",
        ],
        properties: {
          server_url: { type: "string", format: "uri" },
          participant_token: { type: "string" },
          agent_dispatch_mode: {
            type: "string",
            enum: ["token_room_config", "disabled"],
          },
          agent_dispatch_names: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;
