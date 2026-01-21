// Based Data - Landing Hero Component
// The "magic moment" - centered prompt bar with premium aesthetics

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PromptInput } from '@/components/ui/prompt-input';
import { ExamplePrompts } from '@/components/ExamplePrompts';
import { Logo } from '@/components/Logo';
import { Zap, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  isLoggedIn: boolean;
  credits: number;
  userName?: string;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function LandingHero({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  isLoggedIn,
  credits,
  userName,
  onSignIn,
  onSignUp,
}: LandingHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col"
    >
      {/* Subtle glow overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-electric/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-muted-foreground text-sm font-medium lowercase">
                  {credits} credits
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric to-purple flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          ) : (
            <>
              <Button 
                variant="ghost" 
                className="hidden sm:inline-flex lowercase"
                onClick={onSignIn}
              >
                sign in
              </Button>
              <Button 
                variant="hero" 
                size="sm" 
                className="lowercase"
                onClick={onSignUp}
              >
                get started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">all the data.</span>
            <br />
            <span className="text-gradient">on demand.</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto font-light lowercase">
            describe what you need. get structured, ai-enriched datasets in seconds.
          </p>
        </motion.div>

        {/* The Star - Prompt Input */}
        <PromptInput
          value={prompt}
          onChange={onPromptChange}
          onSubmit={onSubmit}
          placeholder="what data do you need?"
          isLoading={isGenerating}
          className="mb-6 px-4 w-full"
        />

        {/* Example Prompts */}
        <ExamplePrompts onSelect={onPromptChange} />

        {/* CTA for non-logged-in users */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group lowercase" 
              onClick={onSignUp}
            >
              <Zap className="w-5 h-5" />
              get 100 free credits
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-muted-foreground/60 lowercase">
              no credit card required • start generating instantly
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-electric/30 to-transparent" />
    </motion.div>
  );
}
