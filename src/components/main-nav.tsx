import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  CalendarIcon,
  FileTextIcon,
  LineChartIcon,
  UsersIcon,
  SettingsIcon,
  HomeIcon,
  MessageSquareIcon,
  LayoutDashboardIcon,
} from "lucide-react";

export function MainNav() {
  const navigate = useNavigate();
  const { user } = useUser();
  const userProfileStatus = useQuery(api.users.checkUserProfileStatus);
  const isDoctor = userProfileStatus?.user?.role === "doctor";
  const isPatient = userProfileStatus?.user?.role === "patient";

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="bg-white border rounded-lg shadow-sm p-1">
        <NavigationMenu className="max-w-full w-full">
          <NavigationMenuList className="flex items-center gap-1 overflow-x-auto">
            {/* Home link - available for both doctor and patient */}
            <NavigationMenuItem>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
                onClick={() => navigate(isDoctor ? "/doctor/home" : isPatient ? "/patient/home" : "/")}
              >
                <HomeIcon className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </NavigationMenuItem>
            
            {/* Dashboard link - available for both doctor and patient */}
            <NavigationMenuItem>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
                onClick={() => navigate(isDoctor ? "/doctor/dashboard" : isPatient ? "/patient/dashboard" : "/dashboard")}
              >
                <LayoutDashboardIcon className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}