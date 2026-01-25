import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Wrench, Zap, Droplet } from 'lucide-react';
import { Routes } from '@/lib/routes';
import PageTitle from '@/components/PageTitle';

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
      href: Routes.orders.newPrintOrder,
      color: 'blue',
      disabled: false,
      features: [
        'PLA, ABS, PETG materials',
        'Complex geometries',
        'Fast prototyping',
        'Multiple colors',
      ],
    },
    {
      type: 'cnc',
      title: 'CNC Machining',
      description: 'Precision subtractive manufacturing',
      icon: Wrench,
      href: Routes.orders.newCncOrder,
      disabled: true,
      color: 'green',
      features: ['Metal & plastic materials', 'High precision', 'Strong parts', 'Tight tolerances'],
    },
    {
      type: 'laser-cutting',
      title: 'Laser Cutting',
      description: 'Precise cutting of sheet materials',
      icon: Zap,
      href: Routes.orders.newLaserCuttingOrder,
      disabled: true,
      color: 'orange',
      features: ['Wood, acrylic, cardboard', '2D designs', 'Clean edges', 'Fast turnaround'],
    },
    {
      type: 'water-jet',
      title: 'Water Jet Cutting',
      description: 'High-pressure cutting for thick materials',
      icon: Droplet,
      href: Routes.orders.newWaterJetOrder,
      disabled: true,
      color: 'cyan',
      features: ['Thick metals & stone', 'No heat-affected zone', 'Very precise', 'Any thickness'],
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-800',
      green:
        'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-800',
      orange:
        'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-800',
      cyan: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-800',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <PageTitle
          title="Create New Order"
          description="Choose the manufacturing service that best fits your project needs"
        />
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
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${getColorClasses(orderType.color)}`}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl">{orderType.title}</CardTitle>
                <CardDescription className="text-sm">{orderType.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Features:</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {orderType.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="mr-2 h-1 w-1 rounded-full bg-current"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                {orderType.disabled ? (
                  <Button className="w-full" size="sm" disabled>
                    Create {orderType.title} Order
                  </Button>
                ) : (
                  <Button asChild className="w-full" size="sm">
                    <Link href={orderType.href}>Create {orderType.title} Order</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
