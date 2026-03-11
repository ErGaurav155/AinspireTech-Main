"use client";

import React, { useEffect, useState } from "react";
import { toast } from "../radix/use-toast";
import { Button } from "../radix/button";
import { Copy } from "lucide-react";

interface EmbedCodeProps {
  userId: string;
  agentId: string;
}

const EmbedCode: React.FC<EmbedCodeProps> = ({ userId, agentId }) => {
  const [isActive, setIsActive] = useState(false);

  const embedCode = `<div id="chatbot-widget-container"></div>
<script strategy="afterInteractive" src="https://rocketreplai.com/widget-loader.js?userId=${userId}&agentId=${agentId}" ></script>`;
  const handleCopyButtonClick = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setIsActive(true);
    } else {
      toast({
        title: "Embed Code Is Empty",
        description: "No text in textbox",
        duration: 5000,
        className: "error-toast",
      });
    }
  };
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive) {
      timer = setTimeout(() => {
        setIsActive(false);
      }, 3000);
    }

    return () => clearTimeout(timer);
  }, [isActive]);
  return (
    <div>
      <div className="flex items-center justify-between ">
        <h3>Embed Code:</h3>
        <Button
          type="submit"
          onClick={handleCopyButtonClick}
          className={`rounded-md self-end mt-3 max-h-min  ${
            isActive
              ? "text-white bg-green-800 hover:bg-[#1c7429]"
              : "text-[#8133b4] bg-[#e4dee7] hover:bg-[#d7b5ed]"
          }  text-md font-bold h-[3.2rem]  min-w-max `}
        >
          <Copy size={20} strokeWidth={2} />
          {isActive ? "Copied" : "Copy"}
        </Button>
      </div>
      <textarea
        readOnly
        className="w-full p-2 mt-2  border text-black min-h-max max-h-min rounded-xl"
        value={embedCode}
        rows={4}
      />
    </div>
  );
};

export default EmbedCode;
