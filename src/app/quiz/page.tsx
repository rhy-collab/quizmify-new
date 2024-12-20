import React from "react";

import { getAuthSession } from "@/lib/nextauth";
import { redirect } from "next/navigation";
import QuizCreation from "@/components/forms/QuizCreation";

export const metadata = {
  title: "Quiz | Quizzzy",
  description: "Quiz yourself on anything!",
};

interface Props {
  searchParams: {
    topic?: string;
  };
}

export default async function Quiz({ 
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getAuthSession();
  
  if (!session) {
    redirect("/");
  }

  // Properly handle the topic from searchParams
  const topic = typeof searchParams.topic === 'string' ? searchParams.topic : "";
  
  return <QuizCreation topic={topic} />;
}
