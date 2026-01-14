'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Settings } from 'lucide-react';
import NewPrintForm from '@/components/PrintRequestForm/NewPrintForm';
// import NewOtherForm from '@/components/OtherRequestForm/NewOtherForm';
{
  /* uncomment this when form is merged */
}

type PrintRequestType = 'normal' | 'manufacturing' | null;

export default function NewPrintPage() {
  const [selectedType, setSelectedType] = useState<PrintRequestType>(null);

  const handleBackToSelection = () => {
    setSelectedType(null);
  };

  // If a type is selected, show the corresponding form
  if (selectedType === 'normal') {
    return (
      <div className="container p-6">
        <Button
          variant="ghost"
          onClick={handleBackToSelection}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Selection
        </Button>
        <NewPrintForm />
      </div>
    );
  }

  if (selectedType === 'manufacturing') {
    return (
      <div className="container p-6">
        <Button
          variant="ghost"
          onClick={handleBackToSelection}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Selection
        </Button>
        {/* uncomment this when form is merged */}
        {/* <NewOtherForm />  */}
      </div>
    );
  }

  // Default selection view
  return (
    <div className="container p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Which print request would you like to make?</h1>
          <p className="text-muted-foreground">
            Choose the type of manufacturing request that best fits your needs
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Normal 3D Print Option */}
          <Card className="select-none transition-all hover:scale-[1.02] hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Printer className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Normal 3D Print</CardTitle>
              <CardDescription>Traditional additive manufacturing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">
                  Perfect for prototypes, models, and custom parts using our FDM 3D printers.
                </p>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Features:</h4>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Multiple material options (PLA, ABS, PETG, etc.)</li>
                    <li>Various print quality settings</li>
                    <li>Support for complex geometries</li>
                    <li>Fast turnaround time</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={() => setSelectedType('normal')}
                className="w-full cursor-pointer"
                size="lg"
              >
                Create 3D Print Request
              </Button>
            </CardContent>
          </Card>

          {/* CNC/WaterJet/LaserCutting Option */}
          <Card className="select-none transition-all hover:scale-[1.02] hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                <Settings className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl">CNC/WaterJet/LaserCutting</CardTitle>
              <CardDescription>Precision manufacturing services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">
                  Professional manufacturing for precision parts and custom cuts from various
                  materials.
                </p>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Available Services:</h4>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      <strong>CNC Machining:</strong> Precision parts from solid materials
                    </li>
                    <li>
                      <strong>Laser Cutting:</strong> Clean cuts in thin materials
                    </li>
                    <li>
                      <strong>Water Jet:</strong> High-pressure cutting for thick materials
                    </li>
                    <li>Wide range of materials (metals, plastics, composites)</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={() => setSelectedType('manufacturing')}
                className="w-full cursor-pointer"
                size="lg"
                variant="secondary"
              >
                Create Manufacturing Request
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
