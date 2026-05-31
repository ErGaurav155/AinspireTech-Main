"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoscroll from "embla-carousel-auto-scroll";
import { Quote, Star } from "lucide-react";
import { testimonials } from "@rocketreplai/shared";
import { Card, CardContent } from "@rocketreplai/ui";

type Testimonial = (typeof testimonials)[number];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="group h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/40">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-blue-100 bg-blue-50 dark:border-blue-400/20 dark:bg-blue-500/10">
              <Image
                src={testimonial.image}
                alt={testimonial.name}
                fill
                sizes="48px"
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <h4 className="font-bold leading-tight text-slate-950 dark:text-white">
                {testimonial.title}
              </h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {testimonial.name}
              </p>
            </div>
          </div>
          <Quote className="h-5 w-5 shrink-0 text-blue-200 transition group-hover:text-blue-500 dark:text-blue-400/40" />
        </div>

        <div className="mt-5 flex gap-1 text-amber-400">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="h-4 w-4 fill-current" />
          ))}
        </div>

        <p className="mt-4 line-clamp-6 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {testimonial.text}
        </p>
      </CardContent>
    </Card>
  );
}

function TestimonialRow({
  direction,
}: {
  direction: "forward" | "backward";
}) {
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
    },
    [
      Autoscroll({
        speed: 0.85,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        direction,
      }),
    ],
  );

  const orderedTestimonials =
    direction === "forward" ? testimonials : [...testimonials].reverse();

  return (
    <div ref={emblaRef} className="overflow-hidden">
      <div className="flex">
        {orderedTestimonials.map((testimonial) => (
          <div
            key={`${direction}-${testimonial.id}`}
            className="min-w-0 flex-[0_0_88%] p-2 sm:flex-[0_0_58%] lg:flex-[0_0_34%]"
          >
            <TestimonialCard testimonial={testimonial} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialSection() {
  const titleVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="relative z-10 w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <motion.div
            className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            Customer Reviews
          </motion.div>
          <motion.h2
            className="text-3xl font-extrabold tracking-normal gradient-text-main md:text-5xl"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            Trusted by teams automating customer conversations
          </motion.h2>
          <motion.p
            className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg"
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: true }}
            initial="hidden"
          >
            Real feedback from founders, creators, and service teams using
            RocketReplai to respond faster and capture more leads.
          </motion.p>
        </div>

        <div className="relative space-y-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent dark:from-slate-950 md:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent dark:from-slate-950 md:w-28" />
          <TestimonialRow direction="forward" />
          <TestimonialRow direction="backward" />
        </div>
      </div>
    </section>
  );
}

export default TestimonialSection;
