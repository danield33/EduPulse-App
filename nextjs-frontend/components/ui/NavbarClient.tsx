"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard } from "lucide-react";

export function NavbarClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by looking for auth token
    const checkAuth = () => {
      const token = getClientSideCookie("accessToken");
      setIsLoggedIn(!!token);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage events
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleLogout = () => {
    // Clear auth cookies
    document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    setIsLoggedIn(false);
    router.push("/");
  };

  // Show nothing while checking auth state
  if (isLoading) {
    return <div className="w-32 h-10" />; // Placeholder to prevent layout shift
  }

  // Show user menu if logged in
  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="rounded-xl border-white text-white bg-transparent shadow-none hover:bg-gray-800/60 hover:text-white focus:ring-0"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl border-white text-white bg-transparent shadow-none hover:bg-gray-800/60 hover:text-white focus:ring-0"
            >
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/watch-lesson" className="cursor-pointer">
                Watch Lesson
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Show auth buttons if not logged in
  return (
    <div className="flex items-center gap-3">
      <Link href="/register">
        <Button
          variant="outline"
          className="rounded-xl border-white text-white bg-transparent shadow-none hover:bg-gray-800/60 hover:text-white focus:ring-0"
        >
          Sign up
        </Button>
      </Link>

      <Link href="/login">
        <Button className="rounded-xl bg-lime-400 text-black hover:bg-lime-500">
          Log in
        </Button>
      </Link>
    </div>
  );
}

// Helper function to read cookies
function getClientSideCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}