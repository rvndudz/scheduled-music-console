"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/upload-event", label: "Create Event" },
  { href: "/events", label: "Manage Events" },
];

const MainNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 text-sm font-semibold">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        const baseClasses =
          "rounded-full border px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";
        const activeClasses =
          "border-indigo-500/70 bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-500 text-white shadow-[0_5px_20px_rgba(99,102,241,0.4)]";
        const inactiveClasses =
          "border-transparent text-slate-200 hover:border-indigo-500/60 hover:text-white";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${baseClasses} ${
              isActive ? activeClasses : inactiveClasses
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default MainNav;
