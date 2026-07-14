"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSuperHoverRef } from "super-hover/react";
import {
  AudioWaveform,
  Bot,
  CreditCard,
  Home,
  Library,
  Palette,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";

const sidebarItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Audio Wave",
    href: "/audiowave",
    icon: AudioWaveform,
  },
  {
    title: "Family",
    href: "/family",
    icon: Users,
  },
  {
    title: "Library",
    href: "/library",
    icon: Library,
  },
  {
    title: "Midjourney",
    href: "/midjourney",
    icon: Sparkles,
  },
  {
    title: "Shaders",
    href: "/shaders",
    icon: Palette,
  },
  {
    title: "Shader Gallery",
    href: "/shaders2",
    icon: Bot,
  },
  {
    title: "Voice Chat",
    href: "/voicechat",
    icon: WalletCards,
  },
  {
    title: "Wallet",
    href: "/wallet",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const navigationHoverRef = useSuperHoverRef({
    sweptHitTest: true,
    sweptHitTestMargin: 80,
  });
  const footerHoverRef = useSuperHoverRef({
    sweptHitTest: true,
    sweptHitTestMargin: 80,
  });

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-10 font-semibold"
              tooltip="Application"
            >
              <Link href="/">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Home className="h-4 w-4" />
                </div>
                <span>Application</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent ref={navigationHoverRef}>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-super-hover
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        ref={footerHoverRef}
        className="border-t border-sidebar-border p-3"
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Design System" data-super-hover>
              <Link href="/library">
                <Palette className="h-4 w-4" />
                <span>Design System</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
