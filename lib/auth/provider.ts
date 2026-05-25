import { mockAuthUsers } from "@/lib/auth/mock-users";

export interface AuthProviderSession {
  userId: string;
  email: string;
  allowedOrganizations: string[];
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<AuthProviderSession | null>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthProviderSession | null>;
}

export const mockAuthProvider: AuthProvider = {
  async signIn(email, password) {
    const user = mockAuthUsers.find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase() && entry.password === password);
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      allowedOrganizations: user.organizationSlugs
    };
  },
  async signOut() {
    return;
  },
  async getSession() {
    return null;
  }
};
