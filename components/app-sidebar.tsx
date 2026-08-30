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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { SignOut } from "@phosphor-icons/react"
import { Plus, Minus } from "lucide-react"
import { signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: any }) {
  const pathname = usePathname()

  const navItems = [
    { title: "Tableau de bord", url: "/dashboard", roles: ["administrateur", "gestionnaire_rh", "directeur", "comptable", "employe"] },
    { title: "Employés", url: "/dashboard/employes", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { title: "Bulletins", url: "/dashboard/bulletins", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur", "employe"] },
    { title: "Périodes", url: "/dashboard/periodes", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { title: "Rapports", url: "/dashboard/rapports", roles: ["administrateur", "gestionnaire_rh", "comptable", "directeur"] },
    { 
      title: "Paramètres", 
      url: "/dashboard/parametres", 
      roles: ["administrateur"],
      items: [
        { title: "Paramètres globaux", url: "/dashboard/parametres/globaux" },
        { title: "Rubriques", url: "/dashboard/parametres/rubriques" },
        { title: "Barème IRPP (OTR)", url: "/dashboard/parametres/bareme" },
      ]
    },
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
              
              if (item.items) {
                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger render={<SidebarMenuButton />}>
                        {item.title}{" "}
                        <Plus className="ml-auto group-data-open/collapsible:hidden" />
                        <Minus className="ml-auto hidden group-data-open/collapsible:block" />
                      </CollapsibleTrigger>
                      {item.items?.length ? (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  render={<a href={subItem.url} />}
                                  isActive={pathname === subItem.url}
                                >
                                  {subItem.title}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      ) : null}
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

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
