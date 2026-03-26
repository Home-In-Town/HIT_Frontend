'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    className?: string;
    headerAction?: ReactNode;
    variant?: 'glass' | 'white' | 'dark';
}

export function PremiumCard({
    children,
    title,
    subtitle,
    icon,
    className,
    headerAction,
    variant = 'white'
}: PremiumCardProps) {
    const variants = {
        white: "bg-white border-[#E7E5E4] shadow-sm shadow-[#B45309]/5",
        glass: "bg-white/70 backdrop-blur-md border-white/40 shadow-xl shadow-black/5",
        dark: "bg-[#1C1917] border-[#2E2A27] text-white shadow-2xl"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-[2rem] border overflow-hidden transition-all duration-300",
                variants[variant],
                className
            )}
        >
            {(title || icon) && (
                <div className="px-8 py-6 flex items-center justify-between border-b border-inherit bg-inherit">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="p-3 rounded-2xl bg-orange-50 text-[#B45309] border border-orange-100 shadow-sm">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && (
                                <h3 className="text-sm font-black text-[#2A2A2A] font-serif uppercase tracking-widest leading-none">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mt-1.5 font-mono">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    {headerAction && (
                        <div className="flex items-center">
                            {headerAction}
                        </div>
                    )}
                </div>
            )}
            <div className="p-8">
                {children}
            </div>
        </motion.div>
    );
}
