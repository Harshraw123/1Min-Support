'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { SessionUser } from "@/lib/getSession";

type Props = {
  user: SessionUser | null;
};

function getDisplayName(user: SessionUser | null): string {
  if (!user) return "";

  const name = user.user?.userProfile?.firstName ?? "";
  const email = user.user?.email ?? "";

  return name || email || "Profile";
}

function getInitial(user: SessionUser | null): string {
  const display = getDisplayName(user).trim();
  return display.charAt(0).toUpperCase() || "U";
}

export default function NavbarClient({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const links = ["Features", "Solutions", "Pricing", "Blog"];

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initial = useMemo(() => getInitial(user), [user]);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  useEffect(() => {
    if (!profileOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = profileRef.current;
      if (!el) return;

      if (e.target instanceof Node && !el.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4 sm:px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="logo" height={50} width={50} />
          <span className="text-lg sm:text-xl font-bold text-primary whitespace-nowrap">
            1Min Support
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          {!user ? (
            <>
              <Button onClick={handleLogin} variant="ghost" size="sm">
                Log In
              </Button>
              <Button size="sm">Get Started</Button>
            </>
          ) : (
            <div className="relative" ref={profileRef}>
              
              {/* Profile Button */}
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {initial}
                </span>
                <span className="text-sm font-medium text-foreground max-w-40 truncate">
                  {displayName}
                </span>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg overflow-hidden">
                  
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold truncate">
                      {user.user?.userProfile?.firstName || "Signed in"}
                    </div>
                    {user.user?.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {user.user.email}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden glass-strong px-4 pb-5 pt-2 flex flex-col gap-4">
          
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {l}
            </a>
          ))}

          {!user ? (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogin}>
                Log In
              </Button>
              <Button size="sm">Get Started</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border px-3 py-2">
              
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {initial}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {displayName}
                  </div>
                  {user.user?.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.user.email}
                    </div>
                  )}
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}