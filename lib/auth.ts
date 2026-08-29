import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { queryOne, query } from './db';
import { logAudit } from './audit';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis');
        }

        const user = await queryOne<any>(
          'SELECT * FROM utilisateurs WHERE email = ? AND actif = 1',
          [credentials.email]
        );

        if (!user) {
          throw new Error('Identifiants incorrects ou compte inactif');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isPasswordValid) {
          throw new Error('Identifiants incorrects');
        }

        // Mettre à jour la date de dernière connexion
        await query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

        // Audit
        await logAudit({
          userId: user.id,
          action: 'CONNEXION',
          details: 'Connexion réussie',
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.nom,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
