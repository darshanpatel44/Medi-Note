import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Navbar() {
  const { user, isLoaded } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const userProfileStatus = useQuery(api.users.checkUserProfileStatus);

  useEffect(() => {
    if (user) {
      createOrUpdateUser();
    }
  }, [user, createOrUpdateUser]);

  return (
    <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-12 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold text-[#1D1D1F]">MediNote</span>
          </Link>

          <div className="flex-1"></div>

          {isLoaded ? (
            <div className="flex items-center gap-4">
              <Authenticated>
                <div className="hidden md:flex items-center gap-4">
                  {userProfileStatus?.profileComplete && (
                    <>
                      {userProfileStatus.user.role === "doctor" && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Doctor</Badge>
                      )}
                      {userProfileStatus.user.role === "patient" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">Patient</Badge>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </Authenticated>
              <Unauthenticated>
                <SignInButton mode="modal" signUpFallbackRedirectUrl="/">
                  <Button
                    variant="default"
                    className="h-8 px-4 text-sm rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
                  >
                    Sign In
                  </Button>
                </SignInButton>
              </Unauthenticated>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-4 w-16 bg-[#F5F5F7] rounded-full animate-pulse"></div>
                <div className="h-8 w-8 rounded-full bg-[#F5F5F7] animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
