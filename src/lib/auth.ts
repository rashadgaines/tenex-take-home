import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.send',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
});

// Helper to get Google tokens for a user
export async function getGoogleTokens(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account) {
    throw new Error('No Google account linked');
  }

  return {
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at,
  };
}

// Helper to update Google tokens after refresh
export async function updateGoogleTokens(
  userId: string,
  accessToken: string,
  expiresAt: number
) {
  await prisma.account.updateMany({
    where: {
      userId,
      provider: 'google',
    },
    data: {
      access_token: accessToken,
      expires_at: expiresAt,
    },
  });
}
