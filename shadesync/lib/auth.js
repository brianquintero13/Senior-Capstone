import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authOptions = {
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: { email: {}, password: {} },
            async authorize(credentials) {
                const email = credentials?.email;
                const password = credentials?.password;
                if (!email || !password) return null;
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error || !data?.user) return null;
                return {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.fullName || data.user.email,
                    access_token: data.session?.access_token,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.email = user.email;
                token.name = user.name;
                token.access_token = user.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = {
                id: token.sub,
                email: token.email,
                name: token.name,
            };
            session.supabaseAccessToken = token.access_token;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
