import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Footer } from "../components/footer";
import { Navbar } from "../components/navbar";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip",
  );
  
  // Get profile completion status
  const profileStatus = useQuery(api.users.checkUserProfileStatus);
  
  // If profile is not complete, redirect to profile setup
  if (profileStatus?.isAuthenticated && !profileStatus?.profileComplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-24 pt-12">
          {/* Header Section */}
          <div className="relative flex flex-col items-center text-center space-y-6 pb-16">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight">
              Account Dashboard
            </h1>
            <p className="text-xl text-[#86868B] max-w-[600px] leading-relaxed">
              Manage your account details and monitor your usage.
            </p>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Clerk User Data */}
            <DataCard title="Personal Information">
              <div className="space-y-3">
                <DataRow label="Full Name" value={user?.fullName} />
                <DataRow
                  label="Email"
                  value={user?.primaryEmailAddress?.emailAddress}
                />
                <DataRow label="User ID" value={user?.id} />
                <DataRow
                  label="Created"
                  value={new Date(user?.createdAt || "").toLocaleDateString()}
                />
                <DataRow
                  label="Email Verified"
                  value={
                    user?.primaryEmailAddress?.verification.status ===
                    "verified"
                      ? "Yes"
                      : "No"
                  }
                />
              </div>
            </DataCard>

            {/* Database User Data */}
            <DataCard title="Account Details">
              <div className="space-y-3">
                <DataRow label="Database ID" value={userData?._id} />
                <DataRow label="Name" value={userData?.name} />
                <DataRow label="Email" value={userData?.email} />
                <DataRow label="Token ID" value={userData?.tokenIdentifier} />
                <DataRow
                  label="Last Updated"
                  value={
                    userData?._creationTime
                      ? new Date(userData._creationTime).toLocaleDateString()
                      : undefined
                  }
                />
              </div>
            </DataCard>

            {/* Session Information */}
            <DataCard title="Security & Privacy">
              <div className="space-y-3">
                <DataRow
                  label="Last Active"
                  value={new Date(user?.lastSignInAt || "").toLocaleString()}
                />
                <DataRow
                  label="Auth Strategy"
                  value={user?.primaryEmailAddress?.verification.strategy}
                />
              </div>
            </DataCard>

            {/* Additional User Details */}
            <DataCard title="Profile Information">
              <div className="space-y-3">
                <DataRow label="Username" value={user?.username} />
                <DataRow label="First Name" value={user?.firstName} />
                <DataRow label="Last Name" value={user?.lastName} />
                <DataRow
                  label="Profile Image"
                  value={user?.imageUrl ? "Available" : "Not Set"}
                />
              </div>
            </DataCard>
          </div>

          {/* JSON Data Preview */}
          <div>
            <DataCard title="Technical Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-[#1D1D1F] mb-3">
                    Clerk User Data
                  </h3>
                  <pre className="bg-[#F5F5F7] p-4 rounded-2xl text-sm overflow-auto max-h-64 text-[#1D1D1F]">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#1D1D1F] mb-3">
                    Database User Data
                  </h3>
                  <pre className="bg-[#F5F5F7] p-4 rounded-2xl text-sm overflow-auto max-h-64 text-[#1D1D1F]">
                    {JSON.stringify(userData, null, 2)}
                  </pre>
                </div>
              </div>
            </DataCard>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[20px] shadow-sm p-8 transition-all hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-[#1D1D1F]">{title}</h2>
      {children}
    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between py-3 border-b border-[#F5F5F7] last:border-0">
      <span className="text-[#86868B]">{label}</span>
      <span className="text-[#1D1D1F] font-medium">{value || "—"}</span>
    </div>
  );
}
