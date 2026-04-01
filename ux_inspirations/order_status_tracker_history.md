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
order-history.tsx
// components/ui/tracking-timeline.tsx

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils"; // Your utility for merging class names

// Define the type for each timeline item
export interface TimelineItem {
  id: string | number;
  title: string;
  date: string;
  status: "completed" | "in-progress" | "pending";
  icon?: React.ReactNode;
}

// Define the props for the main component
interface TrackingTimelineProps {
  items: TimelineItem[];
  className?: string;
}

// Status-specific components for icons to keep the main component clean
const StatusIcon = ({ status, customIcon }: { status: TimelineItem["status"]; customIcon?: React.ReactNode }) => {
  if (customIcon) {
    return <>{customIcon}</>;
  }

  switch (status) {
    case "completed":
      return <Check className="h-4 w-4 text-white" />;
    case "in-progress":
      return <CircleDot className="h-4 w-4 text-primary" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
};

const TrackingTimeline = ({ items, className }: TrackingTimelineProps) => {
  // Animation variants for the container and list items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, // Animate children one by one
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.ol
      className={cn("relative border-l border-border/50 ml-4", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {items.map((item, index) => (
        <motion.li
          key={item.id}
          className="mb-8 ml-8"
          variants={itemVariants}
          aria-current={item.status === "in-progress" ? "step" : undefined}
        >
          {/* The icon circle */}
          <span
            className={cn(
              "absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-background",
              {
                "bg-primary": item.status === "completed",
                "bg-primary/20": item.status === "in-progress",
                "bg-muted": item.status === "pending",
              }
            )}
          >
            {/* Pulsing animation for the 'in-progress' state */}
            {item.status === "in-progress" && (
              <span className="absolute h-full w-full animate-ping rounded-full bg-primary/50 opacity-75" />
            )}
            <StatusIcon status={item.status} customIcon={item.icon} />
          </span>

          {/* Content: Title and Date */}
          <div className="flex flex-col">
            <h3
              className={cn("font-semibold", {
                "text-primary": item.status !== "pending",
                "text-muted-foreground": item.status === "pending",
              })}
            >
              {item.title}
            </h3>
            <time
              className={cn("text-sm text-muted-foreground", {
                "font-medium text-foreground/80": item.status === "in-progress",
              })}
            >
              {item.date}
            </time>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
};

export default TrackingTimeline;

demo.tsx
// demo.tsx

import React from "react";
import TrackingTimeline, { TimelineItem } from "@/components/ui/order-history";
import {
  Home,
  Package,
  Ship,
  Warehouse,
  ClipboardCheck,
  PackageCheck,
} from "lucide-react";

const orderHistoryItems: TimelineItem[] = [
  {
    id: 1,
    status: "completed",
    title: "Order Placed",
    date: "20 Jun 2024, 08:45",
    icon: <ClipboardCheck className="h-4 w-4 text-white" />,
  },
  {
    id: 2,
    status: "completed",
    title: "Order Processed",
    date: "21 Jun 2024, 02:30",
    icon: <Package className="h-4 w-4 text-white" />,
  },
  {
    id: 3,
    status: "completed",
    title: "Pick up",
    date: "22 Jun 2024, 12:34",
    icon: <Warehouse className="h-4 w-4 text-white" />,
  },
  {
    id: 4,
    status: "in-progress",
    title: "Out for shipment",
    date: "Today",
    icon: <Ship className="h-4 w-4 text-primary" />,
  },
  {
    id: 5,
    status: "pending",
    title: "Out for Delivery",
    date: "24 Jun 2024",
    icon: <PackageCheck className="h-4 w-4 text-muted-foreground/50" />,
  },
  {
    id: 6,
    status: "pending",
    title: "Delivered",
    date: "24 Jun 2024",
    icon: <Home className="h-4 w-4 text-muted-foreground/50" />,
  },
];

const TrackingTimelineDemo = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-10">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-card-foreground">Order History</h2>
        <TrackingTimeline items={orderHistoryItems} />
      </div>
    </div>
  );
};

export default TrackingTimelineDemo;
```

Install NPM dependencies:
```bash
lucide-react, framer-motion
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
