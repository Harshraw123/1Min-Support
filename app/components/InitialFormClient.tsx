'use client'

import dynamic from "next/dynamic";

const InitialForm = dynamic(() => import("@/app/components/InitialForm"), {
  ssr: false,
});

interface InitialFormClientProps {
  onSubmit?: (data: {
    businessName: string;
    websiteUrl: string;
    externalLinks: string;
  }) => void | Promise<void>;
}

export default function InitialFormClient({ onSubmit }: InitialFormClientProps) {
  return <InitialForm onSubmit={onSubmit} />;
}