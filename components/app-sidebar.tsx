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
import { peutAcceder, Role, Module } from "@/lib/permissions"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: any }) {
  const pathname = usePathname()

  const navItems = [
    { title: "Tableau de bord", url: "/dashboard", module: "dashboard" },
    { title: "Employés", url: "/dashboard/employes", module: "employes" },
    { title: "Bulletins", url: "/dashboard/bulletins", module: "bulletins_lire" },
    { title: "Périodes", url: "/dashboard/periodes", module: "periodes" },
    { title: "Rapports", url: "/dashboard/rapports", module: "rapports" },
    { 
      title: "Paramètres", 
      url: "/dashboard/parametres", 
      module: "parametres",
      items: [
        { title: "Paramètres globaux", url: "/dashboard/parametres/globaux" },
        { title: "Rubriques", url: "/dashboard/parametres/rubriques" },
        { title: "Barème IRPP (OTR)", url: "/dashboard/parametres/bareme" },
      ]
    },
    { title: "Utilisateurs", url: "/dashboard/utilisateurs", module: "utilisateurs" },
    { title: "Audit", url: "/dashboard/audit", module: "audit" },
  ]

  const filteredNav = navItems.filter(item => peutAcceder(user?.role as Role, item.module as Module))

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
