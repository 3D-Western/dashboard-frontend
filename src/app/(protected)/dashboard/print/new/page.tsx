import NewPrintForm from '@/components/PrintRequestForm/NewPrintForm';

export default function NewPrintPage() {
<<<<<<< HEAD
  return (
    <div className="container p-6">
      <h1 className="text-2xl font-semibold">Create New Print Request</h1>
      <p className="mt-2 text-muted-foreground">Fill out the form to submit a 3D Print.</p>
      <div className="mt-6">
        <NewPrintForm />
      </div>
    </div>
  );
=======
	return (
		<div className="container p-6">
			<div className="mt-6">
				<NewPrintForm />
			</div>
		</div>
	);
>>>>>>> e90eefc (mock submit and unsaved-changes guard)
}
