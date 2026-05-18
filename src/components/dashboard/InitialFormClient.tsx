'use client'

import dynamic from "next/dynamic";

const InitialForm = dynamic(() => import("@/components/dashboard/InitialForm"), {
  ssr: false,
});

interface FormData {
  businessName: string;
  websiteUrl: string;
  externalLinks: string;
}

interface InitialFormClientProps {
  onSubmit?: (data: FormData) => void | Promise<void>;
}

export default function InitialFormClient({ onSubmit }: InitialFormClientProps) {
  return <InitialForm onSubmit={onSubmit} />;
}