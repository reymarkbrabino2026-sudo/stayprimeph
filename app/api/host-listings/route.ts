import { NextResponse } from "next/server";
import { amenityGroups, highlightOptions, hostWizardSteps, privacyTypes, propertyTypes } from "@/lib/host-wizard-data";

export async function GET() {
  return NextResponse.json({
    steps: hostWizardSteps,
    propertyTypes,
    privacyTypes,
    amenityGroups,
    highlightOptions,
  });
}

