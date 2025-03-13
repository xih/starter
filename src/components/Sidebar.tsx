"use client";

import { Home, Inbox, Calendar, Search, Settings } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { usePathname } from "next/navigation";

const sidebarItems = [
  {
    title: "Home",
    href: "/",
    icon: <Home className="h-4 w-4" />,
    message:
      "Like gentle winds that guide the wanderer home,\nThis page shall be your haven and your dome.",
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: <Inbox className="h-4 w-4" />,
    message:
      "Words like birds that fly from heart to heart,\nCarrying thoughts from which we're now apart.",
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: <Calendar className="h-4 w-4" />,
    message:
      "Days and moments, marked in time's embrace,\nEach square a promise, a memory to trace.",
  },
  {
    title: "Search",
    href: "/search",
    icon: <Search className="h-4 w-4" />,
    message:
      "Seek and discover what lies in the deep,\nTreasures of knowledge that others may keep.",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    message:
      "The gears and levers of your digital space,\nTurn them gently to set your perfect pace.",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleNavigation = (item: (typeof sidebarItems)[0]) => {
    // Format the message to preserve line breaks
    const formattedMessage = item.message.replace(/\\n/g, "\n");

    // Show sonnet toast when item is clicked
    toast(item.title, {
      description: formattedMessage,
      duration: 5000,
      className:
        "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-800 border-2 border-purple-300",
    });
  };

  return (
    <Card className="h-screen w-64 rounded-none border-r bg-[hsl(var(--sidebar-background))] shadow-none">
      <CardContent className="p-2">
        <div className="mb-6 text-lg font-medium text-[hsl(var(--sidebar-foreground))]">
          Application
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all",
                pathname === item.href
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]",
              )}
              onClick={() => handleNavigation(item)}
            >
              {item.icon}
              {item.title}
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
