'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Phone, Lock, User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

type Screen = 'login' | 'register' | 'forgot-phone' | 'otp' | 'reset-mpin';

export default function AuthScreens() {
    const [screen, setScreen] = useState<Screen>('login');
    const [loading, setLoading] = useState(false);
    
    // Form fields
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mpin, setMpin] = useState('');
    const [confirmMpin, setConfirmMpin] = useState('');
    const [otpCode, setOtpCode] = useState('');
    
    // Flow tracking
    const [isResetFlow, setIsResetFlow] = useState(false);
    const [forgotPhone, setForgotPhone] = useState('');

    const { checkAuth } = useAuth();
    const router = useRouter();

    // ─── Helper: Format phone with +91 ───
    const formatPhone = (p: string) => p.startsWith('+') ? p : `+91${p}`;

    // ─── Helper: Reset all fields ───
    const resetFields = () => {
        setMpin('');
        setConfirmMpin('');
        setOtpCode('');
        setName('');
        setEmail('');
    };

    // ========================================
    // 1. LOGIN — Phone + MPIN (Direct)
    // ========================================
    const onLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || phone.length < 10) return toast.error("Enter a valid phone number");
        if (!mpin || mpin.length < 4) return toast.error("MPIN should be at least 4 digits");

        try {
            setLoading(true);
            const formattedPhone = formatPhone(phone);
            await authApi.login(formattedPhone, mpin);
            toast.success("Welcome back!");
            await checkAuth();
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message || "Invalid phone or MPIN");
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // 2. REGISTER — Name, Phone, Email, MPIN
    // ========================================
    const onRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return toast.error("Name is required");
        if (!phone || phone.length < 10) return toast.error("Enter a valid phone number");
        if (mpin.length < 4) return toast.error("MPIN should be at least 4 digits");
        if (mpin !== confirmMpin) return toast.error("MPINs do not match");
        
        try {
            setLoading(true);
            const formattedPhone = formatPhone(phone);
            setPhone(formattedPhone);
            await authApi.register({ name, phone: formattedPhone, mpin, email });
            toast.success("OTP sent successfully");
            setIsResetFlow(false);
            setScreen('otp');
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // 3. FORGOT MPIN — Enter Phone → Send OTP
    // ========================================
    const onForgotPhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotPhone || forgotPhone.length < 10) return toast.error("Enter a valid phone number");

        try {
            setLoading(true);
            const formattedPhone = formatPhone(forgotPhone);
            setForgotPhone(formattedPhone);
            await authApi.forgotMpin(formattedPhone);
            setIsResetFlow(true);
            setScreen('otp');
            toast.success("OTP sent for verification");
        } catch (error: any) {
            toast.error(error.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // 4. OTP VERIFICATION
    // ========================================
    const onOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length < 6) return toast.error("Please enter a valid 6-digit OTP");

        try {
            setLoading(true);
            if (isResetFlow) {
                // Move to reset MPIN screen (OTP will be verified on final submit)
                setScreen('reset-mpin');
            } else {
                // Registration OTP verification
                await authApi.verifyOtp(phone, otpCode);
                toast.success("Verification successful!");
                await checkAuth();
                router.push('/dashboard');
            }
        } catch (error: any) {
            toast.error(error.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // 5. RESET MPIN — After OTP
    // ========================================
    const onResetMpinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mpin.length < 4) return toast.error("MPIN should be at least 4 digits");
        if (mpin !== confirmMpin) return toast.error("MPINs do not match");

        try {
            setLoading(true);
            await authApi.resetMpin(forgotPhone, otpCode, mpin);
            toast.success("MPIN reset successful! Please login.");
            resetFields();
            setForgotPhone('');
            setIsResetFlow(false);
            setScreen('login');
        } catch (error: any) {
            toast.error(error.message || "Reset failed");
            if (error.message?.toLowerCase().includes('otp')) {
                setScreen('otp');
            }
        } finally {
            setLoading(false);
        }
    };

    // ─── Shared Input Styles ───
    const inputBase = "w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all";
    const buttonBase = "w-full bg-[#B45309] hover:bg-[#92400E] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#B45309]/20 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer";
    const linkBase = "text-[#B45309] hover:text-[#92400E] text-sm font-bold transition-colors cursor-pointer";

    return (
        <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-[2.5rem] bg-white border border-[#E7E5E4] shadow-2xl shadow-[#B45309]/5 overflow-hidden relative min-h-[500px] flex flex-col justify-center">
            {/* Subtle background texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#B45309_1px,_transparent_1px)] bg-[length:20px_20px]" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
                
                {/* ═══════════════════════════════════════════
                    1. LOGIN SCREEN — Phone + MPIN
                ═══════════════════════════════════════════ */}
                {screen === 'login' && (
                    <motion.form 
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onSubmit={onLoginSubmit}
                        className="space-y-6 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">Welcome</h2>
                            <p className="text-[#57534E]">Enter your credentials to continue</p>
                        </div>

                        {/* Phone */}
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#B45309] transition-colors w-5 h-5" />
                            <input 
                                type="tel"
                                placeholder="Mobile Number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`${inputBase} font-mono text-lg`}
                            />
                        </div>

                        {/* MPIN */}
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#B45309] transition-colors w-5 h-5" />
                            <input 
                                type="password"
                                maxLength={6}
                                placeholder="Enter MPIN"
                                value={mpin}
                                onChange={(e) => setMpin(e.target.value)}
                                className={`${inputBase} text-2xl ${mpin ? 'tracking-[0.8em]' : 'tracking-normal'} placeholder:tracking-normal placeholder:text-base`}
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <button disabled={loading} className={buttonBase}>
                                {loading ? "Logging in..." : (
                                    <>Login <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>

                            <div className="flex justify-between items-center px-1">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        resetFields();
                                        setForgotPhone('');
                                        setScreen('forgot-phone');
                                    }}
                                    className={linkBase}
                                >
                                    Forgot MPIN?
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        resetFields();
                                        setScreen('register');
                                    }}
                                    className={linkBase}
                                >
                                    New User? Register
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}

                {/* ═══════════════════════════════════════════
                    2. REGISTER SCREEN — Name, Phone, Email, MPIN
                ═══════════════════════════════════════════ */}
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
                        
                        {/* Name */}
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

                        {/* Phone */}
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                            <input 
                                type="tel"
                                placeholder="Mobile Number"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-4 text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all font-mono"
                            />
                        </div>

                        {/* Email (Optional) */}
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

                        {/* MPIN / Confirm */}
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
                            <button disabled={loading} className={buttonBase}>
                                {loading ? "Please wait..." : "Register"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    resetFields();
                                    setScreen('login');
                                }}
                                className="text-[#A8A29E] hover:text-[#2A2A2A] text-sm transition-colors text-center cursor-pointer"
                            >
                                Already have an account? <span className="text-[#B45309] font-bold">Login</span>
                            </button>
                        </div>
                    </motion.form>
                )}

                {/* ═══════════════════════════════════════════
                    3. FORGOT MPIN — Enter Phone
                ═══════════════════════════════════════════ */}
                {screen === 'forgot-phone' && (
                    <motion.form 
                        key="forgot-phone"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        onSubmit={onForgotPhoneSubmit}
                        className="space-y-8 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-3xl flex items-center justify-center mb-4 border border-[#B45309]/20 shadow-inner">
                                <Lock className="w-10 h-10 text-[#B45309]" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">Forgot MPIN</h2>
                            <p className="text-[#57534E]">Enter your registered phone number</p>
                        </div>

                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#B45309] transition-colors w-5 h-5" />
                            <input 
                                type="tel"
                                placeholder="Mobile Number"
                                value={forgotPhone}
                                onChange={(e) => setForgotPhone(e.target.value)}
                                className={`${inputBase} font-mono text-lg`}
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <button disabled={loading} className={buttonBase}>
                                {loading ? "Sending OTP..." : (
                                    <>Send OTP <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setScreen('login')}
                                className="text-[#A8A29E] hover:text-[#2A2A2A] text-sm transition-colors text-center cursor-pointer"
                            >
                                Back to <span className="text-[#B45309] font-bold">Login</span>
                            </button>
                        </div>
                    </motion.form>
                )}

                {/* ═══════════════════════════════════════════
                    4. OTP SCREEN
                ═══════════════════════════════════════════ */}
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
                                {isResetFlow ? <Lock className="w-10 h-10 text-[#B45309]" /> : <ShieldCheck className="w-10 h-10 text-[#B45309]" />}
                            </div>
                            <h2 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">
                                {isResetFlow ? "Reset MPIN" : "Verify Phone"}
                            </h2>
                            <p className="text-[#57534E]">
                                {isResetFlow ? "Enter OTP sent to" : "Sent to"}{' '}
                                <span className="text-[#2A2A2A] font-mono font-bold">{isResetFlow ? forgotPhone : phone}</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[#57534E] mb-2 pl-1">
                                    6-Digit OTP Code
                                </label>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className={`w-full bg-[#FAF7F2] border-2 border-[#E7E5E4] rounded-2xl py-5 text-center text-4xl font-bold text-[#B45309] focus:outline-none focus:border-[#B45309] transition-colors placeholder:tracking-normal placeholder:text-2xl ${otpCode ? 'tracking-[0.5em]' : 'tracking-normal'}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <button disabled={loading} className={`${buttonBase} text-lg`}>
                                {loading ? "Verifying..." : isResetFlow ? "Next" : "Verify & Sign Up"}
                            </button>
                            <div className="flex justify-between items-center text-sm px-2">
                                <button 
                                    type="button"
                                    onClick={() => setScreen(isResetFlow ? 'forgot-phone' : 'register')} 
                                    className="text-[#A8A29E] hover:text-[#2A2A2A] transition-colors cursor-pointer"
                                >
                                    Resend Code
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsResetFlow(false);
                                        resetFields();
                                        setScreen('login');
                                    }} 
                                    className="text-[#B45309] font-bold hover:text-[#92400E] transition-colors cursor-pointer"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}

                {/* ═══════════════════════════════════════════
                    5. RESET MPIN SCREEN
                ═══════════════════════════════════════════ */}
                {screen === 'reset-mpin' && (
                    <motion.form 
                        key="reset-mpin"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onSubmit={onResetMpinSubmit}
                        className="space-y-10 relative z-10"
                    >
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-3xl flex items-center justify-center mb-4 border border-[#B45309]/20 shadow-inner">
                                <Lock className="w-10 h-10 text-[#B45309]" />
                            </div>
                            <h2 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">
                                New MPIN
                            </h2>
                            <p className="text-[#57534E]">
                                Create a new 6-digit MPIN for <span className="text-[#2A2A2A] font-mono font-bold">{forgotPhone}</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[#57534E] mb-2 pl-1">
                                    Set New 6-Digit MPIN
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                                    <input 
                                        type="password"
                                        maxLength={6}
                                        placeholder="Enter New MPIN"
                                        value={mpin}
                                        onChange={(e) => setMpin(e.target.value)}
                                        className={`w-full bg-[#FAF7F2] border-2 border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] text-2xl focus:outline-none focus:border-[#B45309] transition-all placeholder:tracking-normal placeholder:text-base ${mpin ? 'tracking-[0.8em]' : 'tracking-normal'}`}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] w-5 h-5" />
                                    <input 
                                        type="password"
                                        maxLength={6}
                                        placeholder="Confirm New MPIN"
                                        value={confirmMpin}
                                        onChange={(e) => setConfirmMpin(e.target.value)}
                                        className={`w-full bg-[#FAF7F2] border-2 border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] text-2xl focus:outline-none focus:border-[#B45309] transition-all placeholder:tracking-normal placeholder:text-base ${confirmMpin ? 'tracking-[0.8em]' : 'tracking-normal'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <button disabled={loading} className={`${buttonBase} text-lg`}>
                                {loading ? "Saving..." : "Save New MPIN"}
                            </button>
                            <div className="flex justify-center items-center text-sm px-2">
                                <button 
                                    type="button"
                                    onClick={() => setScreen('otp')} 
                                    className="text-[#A8A29E] hover:text-[#2A2A2A] transition-colors cursor-pointer"
                                >
                                    Back to OTP
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
                
            </AnimatePresence>
        </div>
    );
}
