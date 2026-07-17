// Better Auth server configuration. Sessions/users live in our Postgres via
// the Drizzle adapter. Sign-in methods: Google OAuth + email magic links
// (sent through Resend) — no passwords stored anywhere.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Ember <onboarding@resend.dev>";

async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Your Ember sign-in link",
    html: `
      <p>Click the link below to sign in to Ember:</p>
      <p><a href="${url}">Sign in to Ember</a></p>
      <p>This link expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
    `,
  });
  if (error) {
    throw new Error(`Failed to send magic link: ${error.message}`);
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    // Must stay last: makes server-initiated auth flows set cookies correctly.
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        // Every account gets its stats row at first sign-in.
        after: async (user) => {
          await db.insert(schema.userStats).values({ userId: user.id }).onConflictDoNothing();
        },
      },
    },
  },
});
