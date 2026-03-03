'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Phone, Lock, User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

type Screen = 'phone' | 'mpin' | 'register' | 'otp';

export default function AuthScreens() {
    const [screen, setScreen] = useState<Screen>('phone');
    const [loading, setLoading] = useState(false);
    
    // Form fields
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mpin, setMpin] = useState('');
    const [confirmMpin, setConfirmMpin] = useState('');
    const [otpCode, setOtpCode] = useState('');
    
    // Selection state
    const [userName, setUserName] = useState('');

    const { checkAuth } = useAuth();
    const router = useRouter();

    // HANDLERS
    
    const onPhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || phone.length < 10) return toast.error("Enter a valid phone number");
        
        try {
            setLoading(true);
            // Ensure phone has + (add default +91 if not present)
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
            setPhone(formattedPhone);
            
            const { exists, name: fetchedName } = await authApi.checkPhone(formattedPhone);
            
            if (exists) {
                setUserName(fetchedName || '');
                setScreen('mpin');
            } else {
                setScreen('register');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const onLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await authApi.login(phone, mpin);
            toast.success("Welcome back!");
            await checkAuth();
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const onRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mpin !== confirmMpin) return toast.error("MPINs do not match");
        if (mpin.length < 4) return toast.error("MPIN should be at least 4 digits");
        
        try {
            setLoading(true);
            await authApi.register({ name, phone, mpin, email });
            toast.success("OTP sent successfully");
            setScreen('otp');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const onOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await authApi.verifyOtp(phone, otpCode);
            toast.success("Verification successful!");
            await checkAuth();
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const onForgotMpin = async () => {
        try {
            setLoading(true);
            await authApi.register({ name: userName, phone, mpin: '0000', email }); // Re-triggering register sends OTP for reset too if handled correctly in backend
            // Or use direct forgot-mpin endpoint
            // await authApi.forgotMpin(phone);
            setScreen('otp');
            toast.success("OTP sent for verification");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    // ANIMATION VARIANTS
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-[2.5rem] bg-white border border-[#E7E5E4] shadow-2xl shadow-[#B45309]/5 overflow-hidden relative min-h-[500px] flex flex-col justify-center">
            {/* Subtle background texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#B45309_1px,_transparent_1px)] bg-[length:20px_20px]" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
                
                {/* 1. PHONE SCREEN */}
                {screen === 'phone' && (
                    <motion.form 
                        key="phone"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onSubmit={onPhoneSubmit}
                        className="space-y-8 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">Welcome</h2>
                            <p className="text-[#57534E]">Enter your mobile number to get started</p>
                        </div>
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#B45309] transition-colors w-5 h-5" />
                            <input 
                                type="tel"
                                placeholder="Mobile Number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all font-mono text-lg"
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-[#B45309] hover:bg-[#92400E] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#B45309]/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {loading ? "Checking..." : (
                                <>
                                    Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.form>
                )}

                {/* 2. MPIN SCREEN (LOGIN) */}
                {screen === 'mpin' && (
                    <motion.form 
                        key="mpin"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        onSubmit={onLoginSubmit}
                        className="space-y-8 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">Hello, {userName}</h2>
                            <p className="text-[#57534E]">Enter your 6-digit MPIN</p>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                            <input 
                                type="password"
                                maxLength={6}
                                placeholder="Enter MPIN"
                                value={mpin}
                                onChange={(e) => setMpin(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] text-center text-2xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <button className="w-full bg-[#B45309] hover:bg-[#92400E] py-4 rounded-2xl text-white font-bold shadow-lg shadow-[#B45309]/20 disabled:opacity-50 transition-all">
                                {loading ? "Logging in..." : "Login"}
                            </button>
                            <div className="flex flex-col items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setScreen('phone')}
                                    className="text-[#A8A29E] hover:text-[#2A2A2A] text-sm transition-colors"
                                >
                                    Not you? Switch account
                                </button>
                                <button 
                                    type="button"
                                    onClick={onForgotMpin}
                                    className="text-[#B45309] hover:text-[#92400E] text-sm font-bold"
                                >
                                    Forgot MPIN?
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}

                {/* 3. REGISTER SCREEN */}
                {screen === 'register' && (
                    <motion.form 
                        key="register"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        onSubmit={onRegisterSubmit}
                        className="space-y-5 relative z-10"
                    >
                        <div className="text-center space-y-2 mb-4">
                            <h2 className="text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">Create Account</h2>
                            <p className="text-[#57534E]">Join HomeInTown Intelligence</p>
                        </div>
                        
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="Full Name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-4 text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                            <input 
                                type="email"
                                placeholder="Email (Optional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-4 text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                                <input 
                                    type="password"
                                    placeholder="Set MPIN"
                                    maxLength={6}
                                    required
                                    value={mpin}
                                    onChange={(e) => setMpin(e.target.value)}
                                    className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 pl-10 pr-4 text-[#2A2A2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                                <input 
                                    type="password"
                                    placeholder="Confirm MPIN"
                                    maxLength={6}
                                    required
                                    value={confirmMpin}
                                    onChange={(e) => setConfirmMpin(e.target.value)}
                                    className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 pl-10 pr-4 text-[#2A2A2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-4">
                            <button className="w-full bg-[#B45309] hover:bg-[#92400E] py-4 rounded-2xl text-white font-bold shadow-lg shadow-[#B45309]/20 transition-all">
                                {loading ? "Please wait..." : "Continue"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setScreen('phone')}
                                className="text-[#A8A29E] hover:text-[#2A2A2A] text-sm transition-colors text-center"
                            >
                                Change phone number
                            </button>
                        </div>
                    </motion.form>
                )}

                {/* 4. OTP SCREEN */}
                {screen === 'otp' && (
                    <motion.form 
                        key="otp"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onSubmit={onOtpSubmit}
                        className="space-y-10 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-3xl flex items-center justify-center mb-4 border border-[#B45309]/20 shadow-inner">
                                <ShieldCheck className="w-10 h-10 text-[#B45309]" />
                            </div>
                            <h2 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">Verify Phone</h2>
                            <p className="text-[#57534E]">Sent to <span className="text-[#2A2A2A] font-mono font-bold">{phone}</span></p>
                        </div>

                        <input 
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full bg-[#FAF7F2] border-2 border-[#E7E5E4] rounded-2xl py-6 text-center text-4xl tracking-[0.5em] font-bold text-[#B45309] focus:outline-none focus:border-[#B45309] transition-colors"
                        />

                        <div className="flex flex-col gap-6">
                            <button className="w-full bg-[#B45309] hover:bg-[#92400E] py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-[#B45309]/20 transition-all">
                                Verify & Sign Up
                            </button>
                            <div className="flex justify-between items-center text-sm px-2">
                                <button 
                                    type="button"
                                    onClick={() => setScreen('phone')} 
                                    className="text-[#A8A29E] hover:text-[#2A2A2A] transition-colors"
                                >
                                    Resend Code
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setScreen('phone')} 
                                    className="text-[#B45309] font-bold hover:text-[#92400E] transition-colors"
                                >
                                    Change Number
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
                
            </AnimatePresence>
        </div>
    );
}
