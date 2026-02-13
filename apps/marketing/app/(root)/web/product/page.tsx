import AvailableProduct from "@/components/web/AvailableProduct";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Review",
  description: "Create Website,ai agent,chatbots in best quality",
  keywords: [
    "lead generation chatbot,customer support chatbot,educational chatbot",
  ],
};
const ProductsPage = () => {
  return (
    <div className="flex flex-col items-center justify-center max-w-7xl m-auto ">
      <BreadcrumbsDefault />
      <AvailableProduct showAvailableOnly={false} />
    </div>
  );
};

export default ProductsPage;
