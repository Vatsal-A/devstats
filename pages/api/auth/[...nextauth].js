import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.login = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.login = token.login;
      session.user.isAuthed = true;
      return session;
    },
  },
  pages: { signIn: "/" },
};

export default NextAuth(authOptions);
