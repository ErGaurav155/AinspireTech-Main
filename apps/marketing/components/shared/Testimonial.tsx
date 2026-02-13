"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import useEmblaCarousel from "embla-carousel-react";
import Autoscroll from "embla-carousel-auto-scroll";
import { testimonials } from "@rocketreplai/shared";
import { Card, CardContent } from "@rocketreplai/ui/components/radix/card";

export function TestimonialSection() {
  const themeStyles = React.useMemo(() => {
    return {
      cardBg: "bg-card",
      cardBorder: "border-[#00F0FF]/30 hover:border-[#B026FF]",
      titleText: "text-foreground",
      subtitleText: "text-muted-foreground",
      descriptionText: "text-muted-foreground",
      sectionText: "text-muted-foreground",
      avatarBg: "bg-background",
    };
  }, []);
  // Forward scrolling carousel (left to right)
  const [emblaRefForward] = useEmblaCarousel(
    {
      loop: true,
    },
    [
      Autoscroll({
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        direction: "forward",
      }),
    ],
  );

  // Backward scrolling carousel (right to left)
  const [emblaRefBackward] = useEmblaCarousel(
    {
      loop: true,
    },
    [
      Autoscroll({
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        direction: "backward",
      }),
    ],
  );

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="w-full pb-10 relative z-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            className={`inline-flex items-center text-blue-600 border border-blue-400/50} rounded-full px-4 py-1 mb-4`}
            variants={titleVariants}
            whileInView="visible"
            viewport={{ once: false }}
            initial="hidden"
          >
            <span className="text-sm font-medium"> CUSTOMER REVIEW</span>
          </motion.div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
            We served over 5000+ customers
          </h2>
          <div className="flex justify-center my-6">
            <div className="w-20 h-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full"></div>
          </div>
          <p
            className={`text-lg ${themeStyles.sectionText} max-w-2xl mx-auto font-montserrat`}
          >
            We are satisfying our customers every day since Last 10+ Years.
          </p>
        </div>

        {/* Forward Direction Carousel (Left to Right) */}
        <div className="mb-12">
          <div ref={emblaRefForward} className="overflow-hidden w-full">
            <div className="flex">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 p-4"
                >
                  <Card
                    className={`${themeStyles.cardBg} backdrop-blur-sm border ${themeStyles.cardBorder} rounded-xl transition-all`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-6">
                        <div className="flex gap-4 items-center">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
                            <div
                              className={`relative w-16 h-16 rounded-full overflow-hidden ${themeStyles.avatarBg} flex items-center justify-center`}
                            >
                              <Image
                                src={testimonial.image}
                                alt={`Testimonial ${testimonial.id}`}
                                fill
                                sizes="100%"
                                className="rounded-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                          <div>
                            <h4
                              className={`text-xs md:text-lg font-medium ${themeStyles.titleText}`}
                            >
                              {testimonial.title}
                            </h4>
                            <span
                              className={`text-xs md:text-sm ${themeStyles.subtitleText}`}
                            >
                              {testimonial.name}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`${themeStyles.descriptionText} h-[10rem] overflow-y-auto no-scrollbar font-montserrat`}
                        >
                          {testimonial.text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Backward Direction Carousel (Right to Left) */}
        <div>
          <div ref={emblaRefBackward} className="overflow-hidden w-full">
            <div className="flex">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 p-4"
                >
                  <Card
                    className={`${themeStyles.cardBg} backdrop-blur-sm border ${themeStyles.cardBorder} rounded-xl transition-all`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-6">
                        <div className="flex gap-4 items-center">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
                            <div
                              className={`relative w-16 h-16 rounded-full overflow-hidden ${themeStyles.avatarBg} flex items-center justify-center`}
                            >
                              <Image
                                src={testimonial.image}
                                alt={`Testimonial ${testimonial.id}`}
                                fill
                                sizes="100%"
                                className="rounded-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                          <div>
                            <h4
                              className={`text-xs md:text-lg font-medium ${themeStyles.titleText}`}
                            >
                              {testimonial.title}
                            </h4>
                            <span
                              className={`text-xs md:text-sm ${themeStyles.subtitleText}`}
                            >
                              {testimonial.name}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`${themeStyles.descriptionText} h-[10rem] overflow-y-auto no-scrollbar font-montserrat`}
                        >
                          {testimonial.text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialSection;
