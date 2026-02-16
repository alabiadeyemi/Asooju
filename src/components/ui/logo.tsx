import { motion } from "framer-motion";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showText?: boolean;
}

export const Logo = ({ className = "", size = "md", showText = false }: LogoProps) => {
    const sizes = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-20 w-20",
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`${sizes[size]} relative group`}>
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/40 blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />

                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                >
                    {/* Outer Ring/Hexagon */}
                    <motion.path
                        d="M50 5L90 28V72L50 95L10 72V28L50 5Z"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/10"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />

                    {/* Core Kernel Structure */}
                    <motion.path
                        d="M50 25L75 40V60L50 75L25 60V40L50 25Z"
                        fill="currentColor"
                        className="text-primary hover:text-white transition-colors duration-500"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.5 }}
                    />

                    {/* Floating Circuit Nodes */}
                    {[
                        { cx: 50, cy: 15 }, // Top
                        { cx: 85, cy: 35 }, // Top Right
                        { cx: 85, cy: 65 }, // Bottom Right
                        { cx: 50, cy: 85 }, // Bottom
                        { cx: 15, cy: 65 }, // Bottom Left
                        { cx: 15, cy: 35 }, // Top Left
                    ].map((pos, i) => (
                        <motion.circle
                            key={i}
                            cx={pos.cx}
                            cy={pos.cy}
                            r="3"
                            fill="currentColor"
                            className="text-primary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0.4] }}
                            transition={{ delay: 1 + i * 0.1, duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        />
                    ))}

                    {/* Inner Light Pulse */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="8"
                        fill="white"
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </svg>
            </div>

            {showText && (
                <span className="font-black text-xl tracking-tighter uppercase text-white">
                    Ship<span className="text-primary italic">Kernel</span>
                </span>
            )}
        </div>
    );
};
