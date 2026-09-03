import { headers } from "next/headers"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const host = headersList.get("host");
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { cookie: headersList.get("cookie") || "" },
    cache: 'no-store'
  });

  if (!res.ok) {
    return <div className="p-8 text-destructive">Erreur lors du chargement du tableau de bord.</div>;
  }

  const data = await res.json();

  return <DashboardClient data={data} />;
}
