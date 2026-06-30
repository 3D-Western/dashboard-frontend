import NewBookingForm from '@/components/Booking/NewBookingForm';
import PageTitle from '@/components/PageTitle'; 

export default function NewBookingPage() {
  return (
    <div className="container space-y-6 p-6">
      <PageTitle 
        title="New Equipment Booking" 
        description="Reserve time on 3D printers, laser cutters, and other lab equipment." 
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <NewBookingForm />
        </div>
        <div className="space-y-4 rounded-xl border bg-muted/30 p-6">
          <h3 className="font-semibold">Booking Guidelines</h3>
          <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
            <li>Check the calendar for available slots before booking.</li>
            <li>Maximum reservation duration is 4 hours per day.</li>
            <li>Please cancel at least 2 hours in advance if you cannot make it.</li>
            <li>Clean the equipment space after you are finished.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}