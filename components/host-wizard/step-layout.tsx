"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/brand/brand-logo";
import { canAdvanceFromStep, getMissingRequirementsForStep } from "@/lib/host-wizard-validation";
import { activeHostWizardSteps } from "@/lib/host-wizard-steps";
import { useHostWizardStore } from "@/stores/host-wizard-store";
import { useState } from "react";
import type { ReactNode } from "react";
import type { WizardStepDefinition } from "@/lib/host-wizard-types";

export function StepLayout({ children, onSaveAndExit, isSavingDraft = false }: { children: ReactNode; onSaveAndExit?: () => void; isSavingDraft?: boolean }) {
  const currentStep = useHostWizardStore((state) => state.currentStep);
  const draft = useHostWizardStore((state) => state.draft);
  const steps = activeHostWizardSteps(draft);
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));

  return (
    <main className="flex min-h-dvh flex-col bg-white text-[#222]">
      <StepHeader onSaveAndExit={onSaveAndExit} isSavingDraft={isSavingDraft} />
      <div className="flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-32 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
      <StepFooter currentIndex={currentIndex} steps={steps} />
    </main>
  );
}

export function StepHeader({ onSaveAndExit, isSavingDraft = false }: { onSaveAndExit?: () => void; isSavingDraft?: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-8 lg:px-12">
      <Link href="/" aria-label="StayPrimePH home" className="inline-flex">
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <div className="flex gap-2 text-sm font-medium">
        <Link href="/support" className="grid min-h-11 place-items-center rounded-full border px-4 transition hover:border-black hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
          Questions?
        </Link>
        <button
          type="button"
          onClick={onSaveAndExit}
          disabled={isSavingDraft || !onSaveAndExit}
          aria-busy={isSavingDraft}
          className="min-h-11 rounded-full border px-4 transition hover:border-black hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingDraft ? "Saving..." : "Save & exit"}
        </button>
      </div>
    </header>
  );
}

export function StepFooter({ currentIndex, steps }: { currentIndex: number; steps: WizardStepDefinition[] }) {
  const { currentStep, draft, setStep } = useHostWizardStore();
  const [validationStep, setValidationStep] = useState<string | null>(null);
  const prev = steps[currentIndex - 1];
  const next = steps[currentIndex + 1];
  const validationMessages = getMissingRequirementsForStep(currentStep, draft);
  const canContinue = canAdvanceFromStep(currentStep, draft);
  const showValidation = validationStep === currentStep && !canContinue && validationMessages.length > 0;

  function goNext() {
    if (!next) return;
    if (!canContinue) {
      setValidationStep(currentStep);
      return;
    }

    setValidationStep(null);
    setStep(next.id);
  }

  return (
    <footer className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 backdrop-blur">
      <ProgressBar currentIndex={currentIndex} steps={steps} />
      {next && showValidation && validationMessages.length ? (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-8 lg:px-12">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
            {validationMessages[0]}
          </p>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-12">
        <button type="button" disabled={!prev} onClick={() => prev && setStep(prev.id)} className="min-h-12 rounded-2xl px-4 font-semibold disabled:opacity-30">
          Back
        </button>
        {next ? (
          <button
            type="button"
            aria-disabled={!canContinue}
            onClick={goNext}
            className={`min-h-12 rounded-2xl px-7 font-semibold transition ${
              canContinue ? "bg-[#222] text-white hover:bg-black" : "bg-black/10 text-black/45 hover:bg-black/15"
            }`}
          >
            Next
          </button>
        ) : null}
      </div>
    </footer>
  );
}

export function ProgressBar({ currentIndex, steps }: { currentIndex: number; steps: WizardStepDefinition[] }) {
  return (
    <div className="grid gap-1 px-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <span key={step.id} className={`h-1.5 ${index <= currentIndex ? "bg-[#222]" : "bg-black/10"}`} />
      ))}
    </div>
  );
}

export function StepTransition({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={stepKey} initial={{ y: 14 }} animate={{ y: 0 }} exit={{ y: -14 }} transition={{ duration: 0.22, ease: "easeOut" }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
