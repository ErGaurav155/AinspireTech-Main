"use client";

import { BreadcrumbsDefault } from "@ainspiretech/ui/components/shared/breadcrumbs";
import ContactForm from "@/components/shared/Contactus";

const contactUs = () => {
  return (
    <div className="mx-auto max-w-7xl w-full gap-5  flex flex-col justify-between items-center ">
      <BreadcrumbsDefault />
      <ContactForm />
    </div>
  );
};

export default contactUs;
