import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [gitHubToken, setGitHubToken] = useState<string | null>(null);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setGitHubToken(session?.provider_token ?? null);
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setGitHubToken(session?.provider_token ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loginWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            toast.success("Successfully logged in");
        } catch (error: any) {
            toast.error("Login failed", {
                description: error.message,
            });
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string, options?: any) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options,
            });
            if (error) throw error;
            toast.success("Signup successful! Please check your email for verification.");
        } catch (error: any) {
            toast.error("Signup failed", {
                description: error.message,
            });
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error("Google Authentication failed", {
                description: error.message,
            });
        }
    };

    const loginWithGitHub = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    redirectTo: window.location.origin,
                    scopes: 'repo',
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error("GitHub Authentication failed", {
                description: error.message,
            });
        }
    };

    const loginAsGuest = () => {
        const mockUser = {
            id: "guest-user-000",
            email: "guest@antigravity.dev",
            user_metadata: {
                full_name: "Architect Guest",
            },
            app_metadata: {
                isGuest: true
            }
        } as any;
        setUser(mockUser);
        localStorage.setItem("shipkernel_mock_user", JSON.stringify(mockUser));
        toast.success("Architect Access Granted (Guest Mode)");
    };

    useEffect(() => {
        const stored = localStorage.getItem("shipkernel_mock_user");
        if (stored && !user) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) { }
        }
    }, [user]);

    const logout = async () => {
        try {
            localStorage.removeItem("shipkernel_mock_user");
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success("Successfully logged out");
        } catch (error: any) {
            toast.error("Logout failed", {
                description: error.message,
            });
        }
    };

    return {
        user,
        loading,
        gitHubToken,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        loginWithGitHub,
        loginAsGuest,
        logout,
    };
};
