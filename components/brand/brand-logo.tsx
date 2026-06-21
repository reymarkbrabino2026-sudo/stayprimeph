import Image from "next/image";

type BrandLogoProps = {
  variant?: "green" | "white";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ variant = "green", className = "h-7 w-auto", priority = true }: BrandLogoProps) {
  return (
    <Image
      src={variant === "white" ? "/logo/stayprime-logo-white.svg" : "/logo/stayprime-logo-colored.svg"}
      alt="StayPrimePH"
      width={608}
      height={232}
      className={className}
      preload={priority}
      loading={priority ? "eager" : undefined}
    />
  );
}
