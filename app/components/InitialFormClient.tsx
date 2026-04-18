'use client'

import dynamic from "next/dynamic";

const InitialForm = dynamic(() => import("@/app/components/InitialForm"), {
  ssr: false,
});

export default function InitialFormClient() {
  return <InitialForm />;
}