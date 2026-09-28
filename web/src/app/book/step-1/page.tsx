import { connection } from "next/server";
import { StepOneClient } from "./step-one-client";
import { getJungles } from "@/lib/jungles";

export default async function StepOnePage() {
  await connection();
  const jungles = await getJungles();
  return <StepOneClient jungles={jungles} />;
}
