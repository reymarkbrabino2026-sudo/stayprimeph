"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/brand/brand-logo";
import { canAdvanceFromStep } from "@/lib/host-wizard-validation";
import { hostWizardSteps } from "@/lib/host-wizard-data";
import { useHostWizardStore } from "@/stores/host-wizard-store";
import type { ReactNode } from "react";

export function StepLayout({ children }: { children: ReactNode }) {
  const currentStep = useHostWizardStore((state) => state.currentStep);
  const currentIndex = Math.max(0, hostWizardSteps.findIndex((step) => step.id === currentStep));

  return (
    <main className="flex min-h-dvh flex-col bg-white text-[#222]">
      <StepHeader />
      <div className="flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-32 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
      <StepFooter currentIndex={currentIndex} />
    </main>
  );
}

export function StepHeader() {
  const router = useRouter();

  function saveAndExit() {
    router.push("/host/listings");
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-8 lg:px-12">
      <Link href="/" aria-label="StayPrimePH home" className="inline-flex">
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <div className="flex gap-2 text-sm font-medium">
        <Link href="/support" className="grid min-h-11 place-items-center rounded-full border px-4 transition hover:border-black hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
          Questions?
        </Link>
        <button type="button" onClick={saveAndExit} className="min-h-11 rounded-full border px-4 transition hover:border-black hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
          Save & exit
        </button>
      </div>
    </header>
  );
}

export function StepFooter({ currentIndex }: { currentIndex: number }) {
  const { currentStep, draft, setStep } = useHostWizardStore();
  const prev = hostWizardSteps[currentIndex - 1];
  const next = hostWizardSteps[currentIndex + 1];
  const canContinue = canAdvanceFromStep(currentStep, draft);

  return (
    <footer className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 backdrop-blur">
      <ProgressBar currentIndex={currentIndex} />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-12">
        <button type="button" disabled={!prev} onClick={() => prev && setStep(prev.id)} className="min-h-12 rounded-2xl px-4 font-semibold disabled:opacity-30">
          Back
        </button>
        {next ? (
          <button type="button" disabled={!canContinue} onClick={() => setStep(next.id)} className="min-h-12 rounded-2xl bg-[#222] px-7 font-semibold text-white disabled:bg-black/10">
            Next
          </button>
        ) : null}
      </div>
    </footer>
  );
}

export function ProgressBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="grid gap-1 px-0" style={{ gridTemplateColumns: `repeat(${hostWizardSteps.length}, minmax(0, 1fr))` }}>
      {hostWizardSteps.map((step, index) => (
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
