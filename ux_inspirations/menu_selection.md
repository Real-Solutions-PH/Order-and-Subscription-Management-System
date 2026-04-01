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
menu-item-card.tsx
// components/ui/menu-item-card.tsx

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Your utility for classname merging
import { Clock } from "lucide-react";

// --- PROPS INTERFACE ---
interface MenuItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  isVegetarian: boolean;
  name: string;
  price: number;
  originalPrice: number;
  quantity: string;
  prepTimeInMinutes: number;
  onAdd: () => void;
}

const MenuItemCard = React.forwardRef<HTMLDivElement, MenuItemCardProps>(
  (
    {
      className,
      imageUrl,
      isVegetarian,
      name,
      price,
      originalPrice,
      quantity,
      prepTimeInMinutes,
      onAdd,
      ...props
    },
    ref
  ) => {
    const savings = originalPrice - price;

    // --- ANIMATION VARIANTS ---
    const cardVariants = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      hover: { scale: 1.03, transition: { duration: 0.2 } },
    };
    
    const buttonVariants = {
      tap: { scale: 0.95 },
    };

    const vegIconVariants = {
       initial: { scale: 0 },
       animate: { scale: 1, transition: { delay: 0.3, type: "spring", stiffness: 200 } },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative flex flex-col w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm group",
          className
        )}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        layout
        {...props}
      >
        {/* --- IMAGE & ADD BUTTON CONTAINER --- */}
        <div className="relative overflow-hidden rounded-t-xl">
          <img
            src={imageUrl}
            alt={name}
            className="object-cover w-full h-48 transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* --- VEGETARIAN ICON --- */}
          <motion.div 
            className="absolute top-3 right-3"
            variants={vegIconVariants}
            aria-label={isVegetarian ? "Vegetarian" : "Non-Vegetarian"}
          >
            <div className={cn(
              "w-5 h-5 border flex items-center justify-center rounded-md",
              isVegetarian ? "border-green-600 bg-background" : "border-red-600 bg-background"
            )}>
              <div className={cn(
                "w-3 h-3 rounded-full",
                isVegetarian ? "bg-green-600" : "bg-red-600"
              )} />
            </div>
          </motion.div>

          {/* --- ADD BUTTON (FIXED) --- */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center">
             {/* The button is now initially hidden and appears on group-hover */}
            <motion.button
              onClick={onAdd}
              variants={buttonVariants}
              whileTap="tap"
              className="px-8 py-2 text-sm font-bold uppercase transition-all duration-300 transform translate-y-4 border rounded-lg shadow-lg opacity-0 bg-background/80 text-foreground backdrop-blur-sm border-border/50 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Add ${name} to cart`}
            >
              Add
            </motion.button>
          </div>
        </div>

        {/* --- CONTENT SECTION (FIXED PADDING) --- */}
        <div className="flex flex-col flex-grow p-4 text-left">
          {/* --- PRICING --- */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">₹{price}</span>
            <span className="text-sm line-through text-muted-foreground">₹{originalPrice}</span>
            {savings > 0 && (
              <span className="text-sm font-semibold text-green-500">SAVE ₹{savings}</span>
            )}
          </div>
          
          {/* --- QUANTITY --- */}
          <p className="mt-1 text-sm text-muted-foreground">{quantity}</p>
          
          {/* --- ITEM NAME --- */}
          <h3 className="mt-2 text-base font-semibold leading-tight text-foreground">{name}</h3>
          
          {/* --- PREP TIME --- */}
          <div className="flex items-center gap-1.5 mt-auto pt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{prepTimeInMinutes} mins</span>
          </div>
        </div>
      </motion.div>
    );
  }
);

MenuItemCard.displayName = "MenuItemCard";

export { MenuItemCard };

demo.tsx
// demo.tsx

import { MenuItemCard } from "@/components/ui/menu-item-card"; // Adjust the import path

const menuItems = [
  {
    imageUrl: "https://cdn.zeptonow.com/production/tr:w-403,ar-5078-5078,pr-true,f-auto,q-80/cms/product_variant/ecf42d53-e139-4643-91d7-3b75ddce5326.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    isVegetarian: true,
    name: "Strawberry Lemonade",
    price: 139,
    originalPrice: 279,
    quantity: "450 ml",
    prepTimeInMinutes: 5,
  },
  {
    imageUrl: "https://cdn.zeptonow.com/production/tr:w-403,ar-5304-5304,pr-true,f-auto,q-80/cms/product_variant/9bc896d4-229d-45a4-8294-b36f97f5992c.jpeg",
    isVegetarian: true,
    name: "Vietnamese Cold Coffee",
    price: 189,
    originalPrice: 529,
    quantity: "450 ml",
    prepTimeInMinutes: 5,
  },
  {
    imageUrl: "https://cdn.zeptonow.com/production/tr:w-403,ar-3618-3618,pr-true,f-auto,q-80/cms/product_variant/ea4bca48-a35d-4fa0-930a-c5bdc2d82695.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    isVegetarian: true,
    name: "Chole & Chapati",
    price: 149,
    originalPrice: 419,
    quantity: "Serves 1",
    prepTimeInMinutes: 5,
  },
  {
    imageUrl: "https://cdn.zeptonow.com/production/tr:w-403,ar-2400-2400,pr-true,f-auto,q-80/cms/product_variant/9d02200a-2335-4d38-b820-bbb9b4a1699c.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    isVegetarian: true,
    name: "Bhelpuri",
    price: 119,
    originalPrice: 229,
    quantity: "1 Portion",
    prepTimeInMinutes: 5,
  },
];

export default function MenuItemCardDemo() {
  const handleAddItem = (itemName: string) => {
    // In a real app, you'd add this to a cart state
    console.log(`Added ${itemName} to cart!`);
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen p-4 bg-background">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {menuItems.map((item, index) => (
          <MenuItemCard
            key={index}
            imageUrl={item.imageUrl}
            isVegetarian={item.isVegetarian}
            name={item.name}
            price={item.price}
            originalPrice={item.originalPrice}
            quantity={item.quantity}
            prepTimeInMinutes={item.prepTimeInMinutes}
            onAdd={() => handleAddItem(item.name)}
          />
        ))}
      </div>
    </div>
  );
}
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
