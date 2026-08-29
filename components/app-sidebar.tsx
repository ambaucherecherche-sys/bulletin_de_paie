"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { SignOut } from "@phosphor-icons/react"
import { signOut } from "next-auth/react"
import { usePathname } from "next/navigation"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: any }) {
  const pathname = usePathname()

  const navItems = [
    { title: "Tableau de bord", url: "/dashboard", roles: ["administrateur", "gestionnaire_rh", "directeur", "comptable", "employe"] },
    { title: "Employés", url: "/dashboard/employes", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { title: "Bulletins", url: "/dashboard/bulletins", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur", "employe"] },
    { title: "Périodes", url: "/dashboard/periodes", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { title: "Rapports", url: "/dashboard/rapports", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { title: "Paramètres", url: "/dashboard/parametres", roles: ["administrateur"] },
    { title: "Utilisateurs", url: "/dashboard/utilisateurs", roles: ["administrateur"] },
    { title: "Audit", url: "/dashboard/audit", roles: ["administrateur"] },
  ]

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => window.location.href = '/dashboard'}>
              <img src="/logo-fa.png" alt="Logo S.I.G" className="size-10 object-contain" />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Solutech Innovation</span>
                <span className="font-light">Group</span>

              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNav.map((item) => {
              const isActive = pathname === item.url || pathname?.startsWith(item.url + '/')
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={isActive} onClick={() => window.location.href = item.url}>
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut({ callbackUrl: '/login' })}>
              <SignOut className="size-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
