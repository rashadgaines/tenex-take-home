/**
 * Database model types - manually defined to match Prisma schema
 * These types mirror the Prisma schema but are defined locally to avoid
 * dependency on dynamically generated @prisma/client types during build.
 */

export interface DbEmailSuggestion {
  id: string;
  userId: string;
  inReplyTo: string | null;
  recipient: string;
  recipientName: string | null;
  context: string;
  subject: string;
  body: string;
  suggestedTimes: unknown; // Json field - TimeSlot[] at runtime
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUser {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  preferences: unknown; // Json field
}

export interface DbAccount {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface DbSession {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}
