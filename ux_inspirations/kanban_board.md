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
kanban-board.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, GripVertical, MessageCircle, Paperclip, Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: {
    name: string;
    avatar: string;
  };
  tags?: string[];
  dueDate?: string;
  attachments?: number;
  comments?: number;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
}

const sampleData: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#8B7355',
    tasks: [
      {
        id: '1',
        title: 'Design System Audit',
        description: 'Review and update component library',
        priority: 'high',
        assignee: { name: 'Sarah Chen', avatar: '/headshot/Lummi Doodle 02.png' },
        tags: ['Design', 'System'],
        dueDate: '2024-01-15',
        attachments: 3,
        comments: 7,
      },
      {
        id: '2',
        title: 'User Research Analysis',
        description: 'Analyze feedback from recent user interviews',
        priority: 'medium',
        assignee: { name: 'Alex Rivera', avatar: '/headshot/Lummi Doodle 04.png' },
        tags: ['Research', 'UX'],
        dueDate: '2024-01-18',
        comments: 4,
      },
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    color: '#6B8E23',
    tasks: [
      {
        id: '3',
        title: 'Mobile App Redesign',
        description: 'Implementing new navigation patterns',
        priority: 'high',
        assignee: { name: 'Jordan Kim', avatar: '/headshot/Lummi Doodle 06.png' },
        tags: ['Mobile', 'UI'],
        attachments: 8,
        comments: 12,
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    color: '#CD853F',
    tasks: [
      {
        id: '4',
        title: 'API Documentation',
        description: 'Complete developer documentation',
        priority: 'medium',
        assignee: { name: 'Maya Patel', avatar: '/headshot/Lummi Doodle 09.png' },
        tags: ['Documentation', 'API'],
        dueDate: '2024-01-20',
        comments: 2,
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#556B2F',
    tasks: [
      {
        id: '5',
        title: 'Landing Page Optimization',
        description: 'Improved conversion rate by 23%',
        priority: 'low',
        assignee: { name: 'Chris Wong', avatar: '/headshot/Lummi Doodle 10.png' },
        tags: ['Marketing', 'Web'],
        attachments: 2,
        comments: 8,
      },
    ],
  },
];

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(sampleData);

  const handleDragStart = (e: React.DragEvent, task: Task, columnId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ task, sourceColumnId: columnId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { task, sourceColumnId } = data;

    if (sourceColumnId === targetColumnId) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
        }
        if (col.id === targetColumnId) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      }),
    );
  };

  return (
    <div className="">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
          Kanban Board
        </h1>
        <p className="text-neutral-700 dark:text-neutral-300">Drag and drop task management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-white/20 dark:bg-neutral-900/20 backdrop-blur-xl rounded-3xl p-5 border border-border dark:border-neutral-700/50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full " style={{ backgroundColor: column.color }} />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {column.title}
                </h3>
                <Badge className="bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200/50 dark:border-neutral-600/50">
                  {column.tasks.length}
                </Badge>
              </div>
              <button className="p-1 rounded-full bg-white/30 dark:bg-neutral-800/30 hover:bg-white/50 dark:hover:bg-neutral-700/50 transition-colors">
                <Plus className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              </button>
            </div>

            <div className="space-y-4">
              {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-move transition-all duration-300 border bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-neutral-700/70"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task, column.id)}
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                          {task.title}
                        </h4>
                        <GripVertical className="w-5 h-5 text-neutral-500 dark:text-neutral-400 cursor-move" />
                      </div>

                      {task.description && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {task.tags && (
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-neutral-100/60 dark:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200 border-neutral-200/50 dark:border-neutral-600/50 backdrop-blur-sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/30 dark:border-neutral-700/30">
                        <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-400">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span className="text-xs font-medium">Jan 15</span>
                            </div>
                          )}
                          {task.comments && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">{task.comments}</span>
                            </div>
                          )}
                          {task.attachments && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="w-4 h-4" />
                              <span className="text-xs font-medium">{task.attachments}</span>
                            </div>
                          )}
                        </div>

                        {task.assignee && (
                          <Avatar className="w-8 h-8 ring-2 ring-white/50 dark:ring-neutral-700/50">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium">
                              {task.assignee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


demo.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, GripVertical, MessageCircle, Paperclip, Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: {
    name: string;
    avatar: string;
  };
  tags?: string[];
  dueDate?: string;
  attachments?: number;
  comments?: number;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
}

const sampleData: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#8B7355',
    tasks: [
      {
        id: '1',
        title: 'Design System Audit',
        description: 'Review and update component library',
        priority: 'high',
        assignee: { name: 'Sarah Chen', avatar: '/headshot/Lummi Doodle 02.png' },
        tags: ['Design', 'System'],
        dueDate: '2024-01-15',
        attachments: 3,
        comments: 7,
      },
      {
        id: '2',
        title: 'User Research Analysis',
        description: 'Analyze feedback from recent user interviews',
        priority: 'medium',
        assignee: { name: 'Alex Rivera', avatar: '/headshot/Lummi Doodle 04.png' },
        tags: ['Research', 'UX'],
        dueDate: '2024-01-18',
        comments: 4,
      },
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    color: '#6B8E23',
    tasks: [
      {
        id: '3',
        title: 'Mobile App Redesign',
        description: 'Implementing new navigation patterns',
        priority: 'high',
        assignee: { name: 'Jordan Kim', avatar: '/headshot/Lummi Doodle 06.png' },
        tags: ['Mobile', 'UI'],
        attachments: 8,
        comments: 12,
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    color: '#CD853F',
    tasks: [
      {
        id: '4',
        title: 'API Documentation',
        description: 'Complete developer documentation',
        priority: 'medium',
        assignee: { name: 'Maya Patel', avatar: '/headshot/Lummi Doodle 09.png' },
        tags: ['Documentation', 'API'],
        dueDate: '2024-01-20',
        comments: 2,
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#556B2F',
    tasks: [
      {
        id: '5',
        title: 'Landing Page Optimization',
        description: 'Improved conversion rate by 23%',
        priority: 'low',
        assignee: { name: 'Chris Wong', avatar: '/headshot/Lummi Doodle 10.png' },
        tags: ['Marketing', 'Web'],
        attachments: 2,
        comments: 8,
      },
    ],
  },
];

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(sampleData);

  const handleDragStart = (e: React.DragEvent, task: Task, columnId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ task, sourceColumnId: columnId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { task, sourceColumnId } = data;

    if (sourceColumnId === targetColumnId) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
        }
        if (col.id === targetColumnId) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      }),
    );
  };

  return (
    <div className="">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
          Kanban Board
        </h1>
        <p className="text-neutral-700 dark:text-neutral-300">Drag and drop task management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-white/20 dark:bg-neutral-900/20 backdrop-blur-xl rounded-3xl p-5 border border-border dark:border-neutral-700/50"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full " style={{ backgroundColor: column.color }} />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {column.title}
                </h3>
                <Badge className="bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200/50 dark:border-neutral-600/50">
                  {column.tasks.length}
                </Badge>
              </div>
              <button className="p-1 rounded-full bg-white/30 dark:bg-neutral-800/30 hover:bg-white/50 dark:hover:bg-neutral-700/50 transition-colors">
                <Plus className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              </button>
            </div>

            <div className="space-y-4">
              {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-move transition-all duration-300 border bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-neutral-700/70"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task, column.id)}
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                          {task.title}
                        </h4>
                        <GripVertical className="w-5 h-5 text-neutral-500 dark:text-neutral-400 cursor-move" />
                      </div>

                      {task.description && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {task.tags && (
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-neutral-100/60 dark:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200 border-neutral-200/50 dark:border-neutral-600/50 backdrop-blur-sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/30 dark:border-neutral-700/30">
                        <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-400">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span className="text-xs font-medium">Jan 15</span>
                            </div>
                          )}
                          {task.comments && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">{task.comments}</span>
                            </div>
                          )}
                          {task.attachments && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="w-4 h-4" />
                              <span className="text-xs font-medium">{task.attachments}</span>
                            </div>
                          )}
                        </div>

                        {task.assignee && (
                          <Avatar className="w-8 h-8 ring-2 ring-white/50 dark:ring-neutral-700/50">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium">
                              {task.assignee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

```

Copy-paste these files for dependencies:
```tsx
shadcn/card
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```
```tsx
shadcn/badge
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```
```tsx
shadcn/avatar
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

```

Install NPM dependencies:
```bash
lucide-react, class-variance-authority, @radix-ui/react-avatar
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
