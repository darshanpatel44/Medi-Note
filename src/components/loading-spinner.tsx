interface LoadingSpinnerProps {
    size?: "default" | "sm" | "lg";
}

export function LoadingSpinner({ size = "default" }: LoadingSpinnerProps) {
    // Get spinner size based on provided prop
    const spinnerSize = 
        size === "sm" ? "h-5 w-5" : 
        size === "lg" ? "h-16 w-16" : 
        "h-12 w-12"; // default
    
    const containerClass = 
        size === "sm" ? "min-h-0" : 
        size === "lg" ? "min-h-[400px]" : 
        "min-h-[200px]"; // default
    
    return (
        <div className={`flex items-center justify-center ${containerClass} bg-transparent`}>
            <div className="flex flex-col items-center space-y-4">
                <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-blue-600`}></div>
                {size !== "sm" && <p className="text-gray-500">Loading...</p>}
            </div>
        </div>
    );
}
