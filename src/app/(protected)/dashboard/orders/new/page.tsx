import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Wrench, Zap, Droplet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'New Order',
  description: 'Choose your manufacturing service',
};

export default function NewOrderPage() {
  const orderTypes = [
    {
      type: 'print',
      title: '3D Printing',
      description: 'Additive manufacturing with various materials',
      icon: Printer,
      href: '/dashboard/orders/print/new',
      color: 'blue',
      features: ['PLA, ABS, PETG materials', 'Complex geometries', 'Fast prototyping', 'Multiple colors'],
    },
    {
      type: 'cnc',
      title: 'CNC Machining',
      description: 'Precision subtractive manufacturing',
      icon: Wrench,
      href: '/dashboard/orders/cnc/new',
      color: 'green',
      features: ['Metal & plastic materials', 'High precision', 'Strong parts', 'Tight tolerances'],
    },
    {
      type: 'laser-cutting',
      title: 'Laser Cutting',
      description: 'Precise cutting of sheet materials',
      icon: Zap,
      href: '/dashboard/orders/laser-cutting/new',
      color: 'orange',
      features: ['Wood, acrylic, cardboard', '2D designs', 'Clean edges', 'Fast turnaround'],
    },
    {
      type: 'water-jet',
      title: 'Water Jet Cutting',
      description: 'High-pressure cutting for thick materials',
      icon: Droplet,
      href: '/dashboard/orders/water-jet/new',
      color: 'cyan',
      features: ['Thick metals & stone', 'No heat-affected zone', 'Very precise', 'Any thickness'],
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-800',
      green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-800',
      orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-800',
      cyan: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-800',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground">
          Choose the manufacturing service that best fits your project needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {orderTypes.map((orderType) => {
          const Icon = orderType.icon;
          return (
            <Card
              key={orderType.type}
              className="group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <CardHeader className="text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${getColorClasses(orderType.color)}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl">{orderType.title}</CardTitle>
                <CardDescription className="text-sm">
                  {orderType.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Features:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {orderType.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="mr-2 h-1 w-1 rounded-full bg-current"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link href={orderType.href}>
                    Create {orderType.title} Order
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}