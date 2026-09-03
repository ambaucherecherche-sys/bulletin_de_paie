import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { peutAcceder } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RapportsClient } from "./rapports-client";

export const metadata = {
  title: "Rapports & États | SOLUTECH",
};

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  if (!peutAcceder(session.user.role as any, "rapports")) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <RapportsClient />
    </div>
  );
}
