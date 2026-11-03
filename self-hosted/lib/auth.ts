import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "../db/schema";
import Rules from "./account-rules.mjs";
export function getAuth() {
  const vars = env as unknown as Record<string, string>;
  const secret = vars.TODO_AUTH_SECRET;
  if (!secret || secret.length < 32) throw Error("Set TODO_AUTH_SECRET to a stable random secret of at least 32 characters");
  const db = env.DB;
  if (!db) throw Error("Account storage is not configured");
  const origin = vars.TODO_AUTH_ORIGIN;
  if (!origin) throw Error("Set TODO_AUTH_ORIGIN to your deployment URL");
  const configured = new URL(origin);
  if (configured.origin !== origin || !["https:", "http:"].includes(configured.protocol))
    throw Error("TODO_AUTH_ORIGIN must be an HTTP(S) origin without a path");
  return betterAuth({
    appName: "ToDo",
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    baseURL: origin,
    secret,
    database: drizzleAdapter(drizzle(db), { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 64,
    },
    socialProviders:
      vars.GOOGLE_CLIENT_ID && vars.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: vars.GOOGLE_CLIENT_ID,
              clientSecret: vars.GOOGLE_CLIENT_SECRET,
              prompt: "select_account",
            },
          }
        : {},
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        // ID signups use an internal email, so explicit Google linking may use a different email.
        allowDifferentEmails: true,
        updateUserInfoOnLink: false,
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 20,
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    plugins: [
      username({
        minUsernameLength: 1,
        maxUsernameLength: 40, // UTF-16 capacity; shared validator enforces 20 Unicode characters.
        // Signup is strictly checked by validateSignup below. Keep existing legacy IDs usable for login.
        usernameValidator: (value) =>
          Rules.validUsername(value) || /^[a-z0-9_-]{5,20}$/.test(value),
        usernameNormalization: Rules.normalizeUsername,
        validationOrder: { username: "post-normalization" },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const error = Rules.validateSignup(ctx.body);
          if (error)
            throw new APIError("BAD_REQUEST", { message: error.message });
          const body = ctx.body as { username: string; name: string; passwordConfirm?: string; [key: string]: unknown };
          const signupBody = { ...body };
          delete signupBody.passwordConfirm;
          const username = Rules.normalizeUsername(body.username);
          // Keep existing ASCII account emails stable; use an ASCII digest for multilingual IDs.
          const emailId = /^[a-z0-9_-]+$/.test(username)
            ? username
            : Array.from(
                new Uint8Array(
                  await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(username),
                  ),
                ),
                (byte) => byte.toString(16).padStart(2, "0"),
              ).join("");
          return {
            context: {
              ...ctx,
              body: {
                ...signupBody,
                email: `${emailId}@accounts.todo.invalid`,
                username,
                name: body.name.trim(),
                displayUsername: body.username,
              },
            },
          };
        }
        if (
          [
            "/sign-in/email",
            "/update-user",
            "/change-email",
            "/set-password",
            "/change-password",
            "/delete-user",
          ].includes(ctx.path)
        )
          throw new APIError("FORBIDDEN", {
            message: "지원하지 않는 요청입니다.",
          });
      }),
    },
  });
}
