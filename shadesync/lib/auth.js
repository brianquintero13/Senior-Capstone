import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials || {};
        // Simple demo auth: accept a fixed user or any non-empty creds
        if (email && password) {
          // In production, verify against your DB here
          return { id: "1", name: email.split("@")[0], email };
        }
        return null;
      },
    }),
  ],
  pages: {},
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = { id: user.id, name: user.name, email: user.email };
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user) session.user = token.user;
      return session;
    },
  },
};
