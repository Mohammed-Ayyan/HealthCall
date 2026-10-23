"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/shared/types/user";
import { authService, LoginCredentials, AuthResponse, ANONYMOUS_USER } from "./authService";
import { getClientSession, saveSession } from "./sessionStore";

interface AuthContextType {
  user: User;
  role: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  isHydrated: boolean;
  login: (creds: LoginCredentials) => Promise<AuthResponse>;
  register: (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => User;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const fallback = initialUser || ANONYMOUS_USER;
  const [user, setUser] = useState<User>(fallback);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initialUser);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Client hydration: Resolve active user from sessionStore
    const clientUser = getClientSession();
    if (clientUser) {
      setUser(clientUser);
      setIsAuthenticated(true);
    } else if (initialUser) {
      saveSession(initialUser);
      setUser(initialUser);
      setIsAuthenticated(true);
    } else {
      setUser(ANONYMOUS_USER);
      setIsAuthenticated(false);
    }
    setIsHydrated(true);
  }, [initialUser]);

  const login = async (creds: LoginCredentials): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const res = await authService.login(creds);
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const res = await authService.register(params);
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(ANONYMOUS_USER);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (newRole: UserRole): User => {
    const updated = authService.switchRole(newRole);
    setUser(updated);
    setIsAuthenticated(true);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        isAuthenticated,
        loading,
        isHydrated,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
