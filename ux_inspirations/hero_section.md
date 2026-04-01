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
hero-section-7.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

/**
 * @typedef FloatingImageProps
 * @property {string} src - The source URL for the image.
 * @property {string} alt - The alt text for the image for accessibility.
 * @property {string} className - Tailwind CSS classes for positioning, sizing, and animation.
 */
interface FloatingImageProps {
  src: string;
  alt: string;
  className: string;
}

/**
 * @typedef FloatingFoodHeroProps
 * @property {string} title - The main heading text.
 * @property {string} description - The paragraph text below the heading.
 * @property {FloatingImageProps[]} images - An array of image objects to be displayed.
 * @property {string} [className] - Optional additional classes for the section container.
 */
export interface FloatingFoodHeroProps {
  title: string;
  description: string;
  images: FloatingImageProps[];
  className?: string;
}

/**
 * A decorative SVG component for the background swirl lines.
 */
const Swirls = () => (
  <>
    <svg
      className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 text-pink-100 dark:text-pink-900/20"
      width="600"
      height="600"
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M515.266 181.33C377.943 51.564 128.537 136.256 50.8123 293.565C-26.9127 450.874 125.728 600 125.728 600"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    <svg
      className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-pink-100 dark:text-pink-900/20"
      width="700"
      height="700"
      viewBox="0 0 700 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M26.8838 528.274C193.934 689.816 480.051 637.218 594.397 451.983C708.742 266.748 543.953 2.22235 543.953 2.22235"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </>
);

/**
 * A responsive and animated hero section component.
 */
export function FloatingFoodHero({
  title,
  description,
  images,
  className,
}: FloatingFoodHeroProps) {
  return (
    <section
      className={cn(
        'relative w-full min-h-[60vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden bg-background py-20 md:py-32',
        className
      )}
    >
      <div className="absolute inset-0 z-0">
        <Swirls />
      </div>
      
      {/* Render floating images */}
      <div className="absolute inset-0 z-10">
        {images.map((image, index) => (
          <img
            key={index}
            src={image.src}
            alt={image.alt}
            className={cn('absolute object-contain', image.className)}
            style={{ animationDelay: `${index * 300}ms` }}
          />
        ))}
      </div>

      {/* Text Content */}
      <div className="relative z-20 container mx-auto px-4 text-center max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}

demo.tsx
import { FloatingFoodHero } from '@/components/ui/hero-section-7'; // Adjust the import path

export default function FloatingFoodHeroDemo() {
  const heroImages = [
    {
      src: 'https://b.zmtcdn.com/data/o2_assets/110a09a9d81f0e5305041c1b507d0f391743058910.png',
      alt: 'A delicious cheeseburger',
      className: 'w-40 sm:w-56 md:w-64 lg:w-72 top-10 left-4 sm:left-10 md:top-20 md:left-20 animate-float',
    },
    {
      src: 'https://b.zmtcdn.com/data/o2_assets/b4f62434088b0ddfa9b370991f58ca601743060218.png',
      alt: 'A bamboo steamer with dumplings',
      className: 'w-28 sm:w-36 md:w-48 top-10 right-4 sm:right-10 md:top-16 md:right-16 animate-float',
    },
    {
      src: 'https://b.zmtcdn.com/data/o2_assets/316495f4ba2a9c9d9aa97fed9fe61cf71743059024.png',
      alt: 'A slice of pizza',
      className: 'w-32 sm:w-40 md:w-56 bottom-8 right-5 sm:right-10 md:bottom-16 md:right-20 animate-float',
    },
     {
      src: 'https://b.zmtcdn.com/data/o2_assets/70b50e1a48a82437bfa2bed925b862701742892555.png',
      alt: 'A basil leaf',
      className: 'w-8 sm:w-12 top-1/4 left-1/3 animate-float',
    },
    {
      src: 'https://b.zmtcdn.com/data/o2_assets/9ef1cc6ecf1d92798507ffad71e9492d1742892584.png',
      alt: 'A slice of tomato',
      className: 'w-8 sm:w-10 top-1/2 right-1/4 animate-float',
    },
    {
      src: 'https://b.zmtcdn.com/data/o2_assets/9ef1cc6ecf1d92798507ffad71e9492d1742892584.png',
      alt: 'A slice of tomato',
      className: 'w-8 sm:w-10 top-3/4 left-1/4 animate-float',
    },
  ];

  return (
    <div className="w-full">
      <FloatingFoodHero
        title="Better food for more people"
        description="For over a decade, we've enabled our customers to discover new tastes, delivered right to their doorstep."
        images={heroImages}
      />
    </div>
  );
}
```

Extend existing Tailwind 4 index.css with this code (or if project uses Tailwind 3, extend tailwind.config.js or globals.css):
```css
@import "tailwindcss";
@import "tw-animate-css";


@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}
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
