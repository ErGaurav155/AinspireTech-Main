import TestimonialSection from "@/components/shared/Testimonial";
import { BreadcrumbsDefault } from "@rocketreplai/ui";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Client Review",
  description: "Create Website,ai agent,chatbots in best quality",
  keywords: ["free ai chatbot"],
};
const Tesimonials = () => {
  return (
    <div className=" mx-auto max-w-7xl w-full flex flex-col justify-between items-center mt-5">
      <TestimonialSection />
    </div>
  );
};

export default Tesimonials;
