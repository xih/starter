import { AppSidebar } from "~/components/Sidebar";
import { VideoPlayer } from "~/components/VideoPlayer";
import { KeyboardShortcuts } from "~/components/KeyboardShortcuts";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-4 md:hidden">
          <SidebarTrigger />
          <span className="ml-2 text-sm font-semibold">Application</span>
        </header>
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background">
          <VideoPlayer />
        </div>
        <KeyboardShortcuts />
      </SidebarInset>
    </SidebarProvider>
  );
}
