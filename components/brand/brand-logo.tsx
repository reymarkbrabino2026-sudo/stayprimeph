import Image from "next/image";

type BrandLogoProps = {
  variant?: "green" | "white";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ variant = "green", className = "h-7 w-auto", priority = true }: BrandLogoProps) {
  return (
    <Image
      src={variant === "white" ? "/stayprimeph-logo-white.svg" : "/stayprimeph-logo.svg"}
      alt="StayPrimePH"
      width={520}
      height={96}
      className={className}
      preload={priority}
      loading={priority ? "eager" : undefined}
    />
  );
}
