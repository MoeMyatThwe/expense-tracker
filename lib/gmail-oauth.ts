import crypto from "crypto";
import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { prisma } from "@/lib/prisma";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getGoogleRedirectUri() {
  // Use NEXT_PUBLIC_APP_URL for production/deployment
  // Falls back to GOOGLE_GMAIL_REDIRECT_URI if explicitly set
  // Falls back to GOOGLE_REDIRECT_URI if explicitly set
  // Local development fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${appUrl}/api/gmail/oauth/callback`
  );
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getGoogleRedirectUri(),
  );
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getSigningSecret() {
  return getRequiredEnv("GOOGLE_CLIENT_SECRET");
}

function getEncryptionKey() {
  const source =
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.DATABASE_URL;

  if (!source) {
    throw new Error("No token encryption secret configured");
  }

  return crypto.createHash("sha256").update(source).digest();
}

export function createOAuthState(userId: string) {
  const payload = {
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    createdAt: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto
      .createHmac("sha256", getSigningSecret())
      .update(encodedPayload)
      .digest(),
  );

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(state: string) {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid OAuth state");
  }

  const expectedSignature = base64UrlEncode(
    crypto
      .createHmac("sha256", getSigningSecret())
      .update(encodedPayload)
      .digest(),
  );

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  ) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
    userId?: string;
    createdAt?: number;
  };

  if (!payload.userId || !payload.createdAt) {
    throw new Error("Invalid OAuth state payload");
  }

  if (Date.now() - payload.createdAt > STATE_MAX_AGE_MS) {
    throw new Error("OAuth state expired");
  }

  return payload.userId;
}

export function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    base64UrlEncode(iv),
    base64UrlEncode(authTag),
    base64UrlEncode(encrypted),
  ].join(".");
}

export function decryptToken(encryptedToken: string) {
  const [iv, authTag, encrypted] = encryptedToken.split(".");
  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted token");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
  );
  decipher.setAuthTag(
    Buffer.from(authTag.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(encrypted.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    ),
    decipher.final(),
  ]).toString("utf8");
}

export async function saveGmailConnection({
  userId,
  tokens,
}: {
  userId: string;
  tokens: Credentials;
}) {
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    const existing = await prisma.gmailConnection.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    throw new Error(
      "Google did not return a refresh token. Please reconnect Gmail.",
    );
  }

  const auth = createOAuthClient();
  auth.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return prisma.gmailConnection.upsert({
    where: { userId },
    update: {
      googleEmail: profile.data.emailAddress || null,
      encryptedRefreshToken: encryptToken(refreshToken),
      scope: Array.isArray(tokens.scope)
        ? tokens.scope.join(" ")
        : tokens.scope,
    },
    create: {
      userId,
      googleEmail: profile.data.emailAddress || null,
      encryptedRefreshToken: encryptToken(refreshToken),
      scope: Array.isArray(tokens.scope)
        ? tokens.scope.join(" ")
        : tokens.scope,
    },
  });
}

export async function getAuthorizedGmailClient(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new Error("Gmail is not connected for this account");
  }

  const auth = createOAuthClient();
  auth.setCredentials({
    refresh_token: decryptToken(connection.encryptedRefreshToken),
  });

  return { auth, connection };
}
