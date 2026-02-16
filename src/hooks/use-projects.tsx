import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const useProjects = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    const createProject = async (prompt: string) => {
        if (!prompt.trim()) {
            toast.error("Please enter a description for your project.");
            return;
        }

        setIsCreating(true);
        const toastId = toast.loading("Initializing your project architecture...");

        try {
            // 1. Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("Please login to create projects", { id: toastId });
                navigate("/auth/login");
                return;
            }

            // 2. Create the project in Supabase
            const { data, error } = await supabase
                .from("projects")
                .insert([
                    {
                        name: prompt.slice(0, 30) + (prompt.length > 30 ? "..." : ""),
                        prompt: prompt,
                        user_id: session.user.id
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            toast.success("Project created! Synchronizing cloud state...", { id: toastId });

            // 3. Navigate to the project builder
            navigate(`/app/projects/${data.id}`);

        } catch (error: any) {
            console.error("Project creation error:", error);

            toast.error("Bridge Connection Failed", {
                description: error.message || "Ensure you have executed the provided SQL in your Supabase Editor.",
                id: toastId
            });
        } finally {
            setIsCreating(false);
        }
    };

    return {
        createProject,
        isCreating
    };
};
