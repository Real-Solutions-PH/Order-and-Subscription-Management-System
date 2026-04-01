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
delivery-scheduler.tsx
// 1. Import Dependencies
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // Make sure you have this utility from shadcn

// 2. Define Component Props
interface DeliverySchedulerProps {
  /**
   * The default date to show on initialization.
   */
  initialDate?: Date;
  /**
   * An array of available time slots for a given day.
   */
  timeSlots: string[];
  /**
   * The timezone to be displayed.
   */
  timeZone: string;
  /**
   * Callback function that is triggered when the "Schedule" button is clicked.
   * It returns the selected date and time.
   */
  onSchedule: (dateTime: { date: Date; time: string }) => void;
  /**
   * Optional CSS class name for custom styling.
   */
  className?: string;
}

// 3. Define Variants for Buttons using CVA
const scheduleButtonVariants = cva(
  'relative isolate inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-foreground hover:bg-muted',
        selected: 'text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// 4. Helper function to get days of the week
const getWeekDays = (startDate: Date): Date[] => {
  const days: Date[] = [];
  // Start from Monday (getDay() returns 0 for Sunday, 1 for Monday, etc.)
  const startOfWeek = new Date(startDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);

  for (let i = 0; i < 6; i++) {
    const nextDay = new Date(startOfWeek);
    nextDay.setDate(startOfWeek.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

// 5. Main Component Logic
export const DeliveryScheduler: React.FC<DeliverySchedulerProps> = ({
  initialDate = new Date(),
  timeSlots,
  timeZone,
  onSchedule,
  className,
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(timeSlots[0] || null);
  
  const weekDays = getWeekDays(currentDate);
  const monthYear = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };
  
  const handleSchedule = () => {
    if (selectedDate && selectedTime) {
      onSchedule({ date: selectedDate, time: selectedTime });
    }
  };

  return (
    <div className={cn('w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-lg', className)}>
      <div className="space-y-6">
        {/* Date Selection Header */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Delivery Window*</label>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="font-semibold">{monthYear}</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => changeWeek('prev')} className="rounded-md p-1 hover:bg-muted">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => changeWeek('next')} className="rounded-md p-1 hover:bg-muted">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Day Selection */}
        <div className="grid grid-cols-6 gap-2">
          {weekDays.map((day) => {
            const isSelected = selectedDate.toDateString() === day.toDateString();
            return (
              <div key={day.toISOString()} className="relative flex flex-col items-center">
                <span className="mb-2 text-xs text-muted-foreground">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <button
                  onClick={() => handleDateSelect(day)}
                  className={cn(scheduleButtonVariants({ variant: isSelected ? 'selected' : 'default' }), 'h-10 w-10')}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        layoutId="date-selector"
                        className="absolute inset-0 z-0 rounded-lg bg-primary"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10">{day.getDate()}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Time Selection */}
        <div>
          <p className="text-sm font-medium">{timeZone}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {timeSlots.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={cn(scheduleButtonVariants({ variant: isSelected ? 'selected' : 'default' }))}
                >
                   <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        layoutId="time-selector"
                        className="absolute inset-0 z-0 rounded-lg bg-primary"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10">{time}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 border-t pt-4">
           <button className={cn(scheduleButtonVariants({variant: 'default'}), 'px-6 bg-muted')}>Cancel</button>
           <button onClick={handleSchedule} className={cn(scheduleButtonVariants({variant: 'selected'}), 'px-6 bg-primary')}>Schedule</button>
        </div>
      </div>
    </div>
  );
};

demo.tsx
// Import the component and necessary hooks/utils
import { DeliveryScheduler } from '@/components/ui/delivery-scheduler';
import React from 'react';

// Main Demo Component
const DeliverySchedulerDemo = () => {
  // Define the available time slots. This would typically come from an API.
  const availableTimes = [
    '4:30 AM', '5:00 AM', '5:30 AM',
    '6:00 AM', '6:30 AM', '7:00 AM'
  ];

  // Define the handler function for when a schedule is confirmed.
  const handleSchedule = (dateTime: { date: Date; time: string }) => {
    // In a real application, you would handle this data, e.g., send it to a server.
    alert(
      `Scheduled!

Date: ${dateTime.date.toLocaleDateString()}
Time: ${dateTime.time}`
    );
  };
  
  return (
    // Center the component on the page for a nice preview
    <div className="flex min-h-[500px] w-full items-center justify-center bg-background p-4">
      <DeliveryScheduler 
        timeSlots={availableTimes}
        timeZone="Lisbon (GMT +1)"
        onSchedule={handleSchedule}
        initialDate={new Date('2025-05-05')} // Example of setting a specific start date
      />
    </div>
  );
};

export default DeliverySchedulerDemo;
```

Install NPM dependencies:
```bash
lucide-react, framer-motion, class-variance-authority
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
