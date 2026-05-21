import Link from "next/link";
import { LayoutDashboard, Users, ScanLine, Calendar, Boxes, CreditCard, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/check-in", label: "Check-in", icon: ScanLine },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/programs", label: "Programs", icon: Boxes },
  { href: "/pos", label: "POS", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
