"use client"; 

import InitialFormClient from "@/app/components/InitialFormClient";
import { useEffect, useState } from "react";

const Page = () => { 

  const [isMetaDataAvailable, setIsMetaDataAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch("/api/metadata/fetch");
        const data = await response.json();
        setIsMetaDataAvailable(data.exists);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      } finally {
        setIsLoading(false); // ✅finally में रखो, दोनों cases में चलेगा
      }
    };

    fetchMetadata();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex w-full items-center justify-center p-4">
        Loading... 
      </div>
    );
  }

  return (
    <div>
      {!isMetaDataAvailable ? ( // ✅ ternary syntax सही किया
        <InitialFormClient />
      ) : (
        <div>Dash</div> // ✅ else case भी चाहिए
      )}
    </div>
  );
};

export default Page;