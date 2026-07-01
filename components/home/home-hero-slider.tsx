"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type HeroSlide = {
  src: string;
  alt: string;
};

const slides: HeroSlide[] = [
  { src: "/hero/baguio-night.jpg", alt: "Baguio city lights at sunset" },
  { src: "/hero/baguio-mountains.jpg", alt: "Mountain village view in Baguio" },
  { src: "/hero/palawan-beach.jpg", alt: "Palawan beach with turquoise water" },
  { src: "/hero/palawan-lagoon.jpg", alt: "Palawan lagoon with kayaks" },
];

export function HomeHeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  function move(direction: -1 | 1) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <section className="relative mt-[72px] block h-[14rem] overflow-hidden bg-[#053f34] text-white sm:h-[18rem] md:mt-0 md:h-[51vh] md:min-h-0">
      <Image
        key={slides[active].src}
        src={slides[active].src}
        alt={slides[active].alt}
        fill
        priority={active === 0}
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

      <div className="absolute inset-x-5 bottom-10 z-10 mx-auto max-w-5xl text-center sm:bottom-14 md:bottom-24 lg:bottom-32">
        <h1 className="text-[1.75rem] font-bold leading-[1.15] tracking-normal text-white [font-stretch:92%] drop-shadow-[0_2px_16px_rgb(0_0_0_/_0.55)] sm:text-4xl md:text-5xl lg:text-[58px]">
          Staycations in the Philippines
        </h1>
      </div>

      <button
        type="button"
        aria-label="Previous hero image"
        onClick={() => move(-1)}
        className="absolute left-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:left-8 md:grid"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        aria-label="Next hero image"
        onClick={() => move(1)}
        className="absolute right-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:right-8 md:grid"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 md:bottom-5">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show hero image ${index + 1}`}
            onClick={() => setActive(index)}
            className="group grid size-10 place-items-center rounded-full transition active:scale-95"
          >
            <span
              className={`h-1.5 rounded-full transition-all ${
                index === active ? "w-8 bg-white" : "w-2 bg-white/55 group-hover:bg-white/80"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
