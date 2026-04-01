You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
order-status-tracker.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define TypeScript types for the component props for type safety and reusability
interface OrderItemProps {
  imageUrl: string;
  name: string;
  details: string;
  price: number;
}

interface OrderSummaryItemProps {
  label: string;
  value: string;
}

interface OrderStatusProps {
  illustrationUrl: string;
  statusTitle: string;
  statusDescription: string;
  item: OrderItemProps;
  summary: OrderSummaryItemProps[];
  trackingStatus: string;
  onTrackOrder?: () => void;
  className?: string;
}

// Reusable Card component for consistent styling
const InfoCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground p-6",
        className
      )}
      {...props}
    />
  )
);
InfoCard.displayName = "InfoCard";


export const OrderStatus: React.FC<OrderStatusProps> = ({
  illustrationUrl,
  statusTitle,
  statusDescription,
  item,
  summary,
  trackingStatus,
  onTrackOrder,
  className,
}) => {
  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className={cn("max-w-md w-full mx-auto p-4 font-sans", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header section with illustration and status */}
      <motion.div variants={itemVariants} className="text-center space-y-2 mb-8">
        <img
          src={illustrationUrl}
          alt="Order Status Illustration"
          className="w-32 h-32 mx-auto"
        />
        <h1 className="text-2xl font-bold text-foreground">{statusTitle}</h1>
        <p className="text-muted-foreground">{statusDescription}</p>
      </motion.div>

      {/* Ordered item details card */}
      <motion.div variants={itemVariants} className="mb-6">
        <InfoCard>
          <div className="flex items-center space-x-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-lg bg-muted object-cover"
            />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.details}</p>
            </div>
            <p className="font-bold text-foreground">
              ${item.price.toFixed(2)}
            </p>
          </div>
        </InfoCard>
      </motion.div>
      
      {/* Order summary card */}
      <motion.div variants={itemVariants} className="mb-8">
        <InfoCard className="space-y-4">
            <h2 className="font-semibold text-lg text-foreground">Order Summary</h2>
            {summary.map((line, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                    <p className="text-muted-foreground">{line.label}</p>
                    <p className="text-foreground font-medium text-right">{line.value}</p>
                </div>
            ))}
        </InfoCard>
      </motion.div>

      {/* Action button and final status text */}
      <motion.div variants={itemVariants} className="text-center space-y-3">
        <Button onClick={onTrackOrder} className="w-full">
            Track order
        </Button>
        <p className="text-xs text-green-600 dark:text-green-500 font-medium">{trackingStatus}</p>
      </motion.div>
    </motion.div>
  );
};

demo.tsx
import { OrderStatus } from "@/components/ui/order-status-tracker";

export default function OrderStatusDemo() {
  // Sample data to populate the component
  const orderData = {
    illustrationUrl: "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-HNciDluT0NAzIwovOE2g7EpZORt7CQ.png&w=320&q=75",
    statusTitle: "Order Status",
    statusDescription: "Your package is on the way",
    item: {
      imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=64&h=64&fit=crop&q=80",
      name: "Apple Watch",
      details: "Color: Grey",
      price: 1500.00,
    },
    summary: [
      { label: "Order ID", value: "153468790876" },
      { label: "Shipping Address", value: "45 Onye's House" },
      { label: "Tracking ID", value: "153468790876" },
      { label: "Estimated Delivery", value: "11/03/25; 04:54pm" },
    ],
    trackingStatus: "Your order is confirmed and in transit",
  };

  const handleTrackOrder = () => {
    // In a real app, this would trigger navigation or a modal
    console.log("Track order button clicked!");
    alert("Tracking functionality would be implemented here.");
  };

  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <OrderStatus
        illustrationUrl={orderData.illustrationUrl}
        statusTitle={orderData.statusTitle}
        statusDescription={orderData.statusDescription}
        item={orderData.item}
        summary={orderData.summary}
        trackingStatus={orderData.trackingStatus}
        onTrackOrder={handleTrackOrder}
      />
    </div>
  );
}
```

Copy-paste these files for dependencies:
```tsx
shadcn/button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

Install NPM dependencies:
```bash
framer-motion, @radix-ui/react-slot, class-variance-authority
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
