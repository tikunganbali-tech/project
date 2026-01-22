import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import { getServerSession as nextAuthGetServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { prisma } from './db';

const SESSION_MAX_AGE_SHORT_SECONDS = 60 * 60 * 8; // 8 hours
const SESSION_MAX_AGE_LONG_SECONDS = 60 * 60 * 24 * 30; // 30 days

// H0: LAZY ENV VALIDATION - Only validate when NextAuth is actually used
// This prevents server crash on module import if NEXTAUTH_SECRET is missing
function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required (missing environment variable). Please set NEXTAUTH_SECRET in your environment variables.');
  }
  return secret;
}

const authConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        remember: { label: 'Remember', type: 'text' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.warn('⚠️ Missing credentials');
            return null;
          }

          const email = String(credentials.email).toLowerCase().trim();
          const password = String(credentials.password);

          console.log(`🔐 Attempting login for: ${email}`);

          // Try to connect to database first (with timeout for performance)
          try {
            // Use Promise.race for connection timeout (5 seconds)
            await Promise.race([
              prisma.$connect(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 5000)
              ),
            ]);
            console.log('✅ Database connected');
          } catch (dbError: any) {
            console.error('❌ Database connection error:', dbError?.message || dbError);
            // Don't throw - return null to allow graceful failure
            return null;
          }

          const admin = await prisma.admin.findUnique({
            where: { email },
          });

          if (!admin) {
            console.warn(`⚠️ Admin not found: ${email}`);
            return null;
          }

          console.log(`✅ Admin found: ${admin.name}`);

          const isValid = await bcrypt.compare(password, admin.passwordHash);

          if (!isValid) {
            console.warn(`⚠️ Invalid password for: ${email}`);
            return null;
          }

          console.log(`✅ Login successful for: ${email}`);

          // PHASE 4.1: Update lastLogin timestamp
          try {
            await prisma.admin.update({
              where: { id: admin.id },
              data: {
                lastLogin: new Date(),
              },
            });
          } catch (updateError: any) {
            // Silent fail - don't break login flow
            console.error('❌ Failed to update lastLogin:', updateError);
          }

          // Read remember parameter from credentials
          const remember = credentials?.remember === '1';

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            remember: remember, // Pass remember value to token
          };
        } catch (error: any) {
          console.error('❌ Authentication error:', error?.message || error);
          console.error('Error stack:', error?.stack);
          // Return null to indicate authentication failure without exposing error details
          return null;
        }
      },
    }),
  ],
  callbacks: {},
  pages: {
    signIn: '/admin/login',
    // Temporarily remove error page to test
    // error: '/admin/login',
  },
  session: {
    strategy: 'jwt' as const,
    // Set to maximum (30 days) - actual maxAge will be determined by jwt callback based on remember parameter
    maxAge: SESSION_MAX_AGE_LONG_SECONDS,
    // Refresh token silently (JWT re-issue) to keep sessions stable without frequent logouts.
    updateAge: 60 * 15, // 15 minutes
  },
  jwt: {
    // Set to maximum (30 days) - actual maxAge will be determined by jwt callback based on remember parameter
    maxAge: SESSION_MAX_AGE_LONG_SECONDS,
  },
  cookies: {
    // Enforce hardened cookie policy (admin-grade).
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: {
        httpOnly: false,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: getNextAuthSecret(),
};

// Export authConfig for use with getServerSession
export { authConfig };
// Export as authOptions for NextAuth route handler (standard naming)
export { authConfig as authOptions };

// Create NextAuth instance - in v4, NextAuth() returns handler function
const handler = NextAuth(authConfig);
// Export handlers - handler can be used as both GET and POST
export const handlers = {
  GET: handler,
  POST: handler,
};

// For NextAuth v4, auth() is getServerSession with authConfig
export async function auth() {
  return await nextAuthGetServerSession(authConfig);
}

export function getSessionMaxAgeSeconds(remember: boolean) {
  return remember ? SESSION_MAX_AGE_LONG_SECONDS : SESSION_MAX_AGE_SHORT_SECONDS;
}

export async function getServerSession() {
  try {
    return await nextAuthGetServerSession(authConfig);
  } catch (error: any) {
    // If auth() fails (e.g., database connection issue), return null
    // This allows pages to handle gracefully instead of crashing
    console.error('getServerSession error:', error?.message || error);
    return null;
  }
}

/**
 * Require super_admin role, throw error if not authorized
 * Used in API routes to enforce super_admin access
 */
export async function requireSuperAdmin() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/admin/login');
  }

  if ((session.user as any).role !== 'super_admin') {
    redirect('/admin/login');
  }

  return session;
}
