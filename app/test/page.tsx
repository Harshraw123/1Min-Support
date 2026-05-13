import React from "react";
import Script from "next/script";

const Page = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-foreground text-2xl font-bold">
          Chatbot Test Environment
        </h1>
        <p className="text-muted-foreground text-sm">
          Testing widget embedding with token theme integration
        </p>
      </div>
      
      {/* This script simulates how a client would embed your chatbot.
          The 'data-id' matches the unique ID of the chatbot in your database.
      */}
      <Script
        src="http://localhost:3000/widget.js"
        data-id="a6afa329-a3c5-4104-b71b-e23717929846"
        strategy="lazyOnload"
      />
    </div>
  );
};

export default Page;