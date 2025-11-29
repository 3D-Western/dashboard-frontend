import NewPrintForm from '@/components/PrintRequestForm/NewPrintForm';

export default function NewPrintPage() {
	return (
		<div className="container p-6">
			<h1 className="text-2xl font-semibold">Create New Print Request</h1>
			<p className="text-muted-foreground mt-2">Fill out the form to submit a 3D Print.</p>
			<div className="mt-6">
				<NewPrintForm />
			</div>
		</div>
	);
}
