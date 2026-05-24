import React, { useState } from "react";
import { ArrowLeft, CreditCard, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import Logo from "./Logo.tsx";

interface PaymentCheckoutProps {
  plan: {
    name: string;
    price: string;
  };
  onBack: () => void;
}

export default function PaymentCheckout({ plan, onBack }: PaymentCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
    }, 2500);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 text-brand-text-primary selection:bg-brand-primary/30 transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-brand-surface border border-brand-border p-8 rounded-3xl space-y-8 relative overflow-hidden shadow-2xl"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-brand-text-primary/10 rounded-full animate-pulse flex items-center justify-center">
               <ShieldCheck className="w-8 h-8 text-brand-text-secondary/50" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="w-3/4 h-6 bg-brand-text-primary/10 rounded-lg animate-pulse mx-auto"></div>
            <div className="w-1/2 h-4 bg-brand-text-primary/10 rounded-lg animate-pulse mx-auto"></div>
          </div>
          <div className="space-y-3 pt-4 border-t border-brand-border/50">
            <div className="w-full h-12 bg-brand-text-primary/10 rounded-xl animate-pulse"></div>
            <div className="w-full h-12 bg-brand-text-primary/10 rounded-xl animate-pulse"></div>
          </div>
          <div className="text-center pt-2">
            <span className="text-xs font-mono text-brand-text-secondary uppercase tracking-widest font-bold animate-pulse">
              Authenticating Transaction...
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6 text-brand-text-primary selection:bg-brand-primary/30 transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-brand-surface border border-emerald-500/30 p-8 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pulse"></div>
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-brand-text-primary mb-2">Payment Successful!</h2>
            <p className="text-brand-text-secondary text-sm">Your subscription to {plan.name} has been activated. Welcome to Adviso Enterprise Platform.</p>
          </div>
          <button onClick={onBack} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-transform">
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background flex text-brand-text-primary selection:bg-brand-primary/30 w-full relative overflow-hidden transition-colors duration-500">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-gradient-to-bl from-brand-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="w-full max-w-[2000px] mx-auto px-6 md:px-12 xl:px-24 flex flex-col pt-8 lg:pt-0">
        
        {/* Navigation Bar inside checkout */}
        <header className="h-24 flex items-center justify-between w-full relative z-20 shrink-0">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-brand-text-secondary hover:text-brand-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
              <span className="font-bold text-xs">AI</span>
            </div>
            <span className="font-bold tracking-tight">Adviso AI</span>
          </div>
        </header>

        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
          
          {/* Left Column: Order Summary */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-10 py-12"
          >
            <div className="space-y-4">
              <span className="text-xs font-mono text-brand-primary font-bold uppercase tracking-widest bg-brand-primary/10 px-3 py-1.5 rounded-full border border-brand-primary/20 inline-block">
                SECURE CHECKOUT
              </span>
              <h1 className="text-4xl lg:text-5xl font-black text-brand-text-primary tracking-tight leading-tight">
                Complete your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-400">subscription</span>
              </h1>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-brand-text-primary">{plan.name} Plan</h3>
                  <p className="text-sm text-brand-text-secondary mt-1">Billed annually securely via Merchant Network.</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-brand-text-primary">{plan.price}</div>
                  <div className="text-xs text-brand-text-secondary mt-1 tracking-widest uppercase font-mono">/ month</div>
                </div>
              </div>
              
              <div className="w-full h-px bg-brand-border"></div>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-sm text-brand-text-primary font-medium">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" /> Continuous Operations sync
                </div>
                <div className="flex items-center gap-3 text-sm text-brand-text-primary font-medium">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" /> What-if Simulation algorithms
                </div>
                <div className="flex items-center gap-3 text-sm text-brand-text-primary font-medium">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" /> Zero-Trust security protocol
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-brand-text-secondary opacity-80 p-4 rounded-2xl border border-brand-border/50 bg-brand-surface-secondary/50">
              <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
              <p className="leading-relaxed">Guaranteed secure transaction. 256-bit SSL encryption. <br/> PCI-DSS Level 1 compliant gateway processing.</p>
            </div>
          </motion.div>

          {/* Right Column: Payment Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-6 xl:col-span-7 flex justify-end"
          >
            <div className="w-full max-w-xl bg-brand-surface border border-brand-border p-8 sm:p-12 rounded-[2rem] shadow-2xl relative">
              <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
                
                {/* Payment Method Selector */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider font-mono block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      onClick={() => setPaymentMethod("card")}
                      className={`h-16 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${
                        paymentMethod === "card" 
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/50 shadow-sm" 
                          : "border-brand-border bg-brand-surface text-brand-text-secondary hover:border-brand-text-primary/30"
                      }`}
                    >
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div 
                      onClick={() => setPaymentMethod("gpay")}
                      className={`h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer transition-all border ${
                        paymentMethod === "gpay" 
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/50 shadow-sm" 
                          : "border-brand-border bg-brand-surface text-brand-text-secondary hover:border-brand-text-primary/30"
                      }`}
                    >
                      GPay
                    </div>
                    <div 
                      onClick={() => setPaymentMethod("razorpay")}
                      className={`h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer transition-all border ${
                        paymentMethod === "razorpay" 
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/50 shadow-sm" 
                          : "border-brand-border bg-brand-surface text-brand-text-secondary hover:border-brand-text-primary/30"
                      }`}
                    >
                      Razorpay
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider font-mono block mb-2">
                    {paymentMethod === 'card' ? 'Card Details' : 'Account Details'}
                  </label>
                  
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          placeholder="Cardholder Name" 
                          className="w-full h-14 bg-brand-surface-secondary/50 border border-brand-border rounded-xl px-4 text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all shadow-sm"
                        />
                      </div>
                      
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          placeholder="0000 0000 0000 0000" 
                          className="w-full h-14 bg-brand-surface-secondary/50 border border-brand-border rounded-xl px-12 text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono shadow-sm"
                        />
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          required 
                          placeholder="MM/YY" 
                          className="w-full h-14 bg-brand-surface-secondary/50 border border-brand-border rounded-xl px-4 text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono shadow-sm"
                        />
                        <div className="relative">
                          <input 
                            type="text" 
                            required 
                            placeholder="CVC" 
                            className="w-full h-14 bg-brand-surface-secondary/50 border border-brand-border rounded-xl px-4 pr-12 text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono shadow-sm"
                          />
                          <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary/50" />
                        </div>
                      </div>
                    </div>
                  )}
                  {paymentMethod !== 'card' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <input 
                          type="email" 
                          required 
                          placeholder="Email Address linked to Account" 
                          className="w-full h-14 bg-brand-surface-secondary/50 border border-brand-border rounded-xl px-4 text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all shadow-sm"
                        />
                      </div>
                      <div className="bg-brand-surface-secondary/50 border border-brand-border p-6 rounded-xl text-sm text-brand-text-secondary text-center">
                        You will be redirected to <strong className="text-brand-text-primary">{paymentMethod === 'gpay' ? 'Google Pay' : 'Razorpay'}</strong> to complete your transaction securely.
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full h-14 bg-brand-text-primary text-brand-background font-bold text-base rounded-xl shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" /> Pay {plan.price === 'Custom' ? '' : plan.price}
                    </span>
                  </button>
                </div>

                <p className="text-center text-xs text-brand-text-secondary/80 pt-4 leading-relaxed max-w-sm mx-auto">
                  By confirming your subscription, you allow Adviso AI to charge your selected payment method.
                </p>
              </form>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
