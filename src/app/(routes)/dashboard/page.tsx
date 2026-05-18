"use client"; 

import InitialFormClient from "@/components/dashboard/InitialFormClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { submitMetadata } from "@/lib/onboarding/api";

const Page = () => { 

  const [isMetaDataAvailable, setIsMetaDataAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMetadata = async () => {

      try {
        const response = await fetch("/api/metadata/fetch");
        const data = await response.json();
        setIsMetaDataAvailable(data.exists);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      } finally {
        setIsLoading(false); 
      }
    };

    fetchMetadata();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full border border-border border-t-foreground animate-spin [animation-duration:1s] [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]" />
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!isMetaDataAvailable ? ( 
        <InitialFormClient
          onSubmit={async (data) => {
            await submitMetadata(data);
            setIsMetaDataAvailable(true);
            router.replace("/dashboard/settings");
            router.refresh();
          }}
        />
      ) : (
       <></>
      )}
    </div>
  );
};

export default Page;