import TestimonialSection from "@/components/shared/Testimonial";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Client Review",
  description: "Create Website,ai agent,chatbots in best quality",
  keywords: ["free ai chatbot"],
};
const Tesimonials = () => {
  return (
    <div className=" mx-auto max-w-7xl w-full flex flex-col justify-between items-center ">
      <BreadcrumbsDefault />
      <TestimonialSection />
    </div>
  );
};

export default Tesimonials;
