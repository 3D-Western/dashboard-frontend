'use client';
import PrintJobsTable from '@/components/PrintJobsTable';
import { getPrintJobs } from '@/services/print-job-services';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { useState, useCallback, useEffect } from 'react';

export default function DashboardPage() {
  // const [filterText, setFilterText] = useState<string>('');
  // const [selectedPrints, setSelectedPrints] = useState<number[]>([]);

  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getPrintJobs()
      .then((jobs) => {
        setPrintJobs(jobs);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch print jobs');
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="container p-6 space-y-6">
      <div className="space-y-2">
        <div className="font-bold text-4xl">Prints</div>
        <div className="text-muted-foreground">Manage your prints</div>
      </div>

      <div className="border">
        <PrintJobsTable printJobs={printJobs} />
      </div>
    </div>
  );

  // return (
  //   <div className="min-h-screen bg-black text-white">
  //     {/* Header */}
  //     <header className="flex items-center justify-between p-6">
  //       <button
  //         onClick={handleLogout}
  //         className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
  //       >
  //         Logout
  //       </button>

  //       <div className="text-center">
  //         <h1 className="text-4xl md:text-5xl font-bold text-white">Welcome,</h1>
  //         <h1 className="text-4xl md:text-5xl font-bold text-white">Simon</h1>
  //       </div>

  //       <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
  //         <User className="w-6 h-6 text-gray-300" />
  //       </div>
  //     </header>

  //     {/* Main Content */}
  //     <main className="px-6 pb-6 container">
  //       <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
  //         {/* Prints Section Header */}
  //         <div className="flex items-center justify-between p-6 border-b border-gray-700">
  //           <div>
  //             <h2 className="text-3xl font-bold text-white mb-2">Prints</h2>
  //             <p className="text-gray-400 text-sm">Manage your prints</p>
  //           </div>
  //           <button
  //             onClick={handleNewPrint}
  //             className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
  //           >
  //             New Print
  //           </button>
  //         </div>

  //         {/* Filter */}
  //         <div className="p-6 border-b border-gray-700">
  //           <div className="relative">
  //             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
  //             <input
  //               type="text"
  //               placeholder="Filter by name..."
  //               value={filterText}
  //               onChange={(e) => setFilterText(e.target.value)}
  //               className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  //             />
  //           </div>
  //         </div>

  //         {/* Table */}
  //         <div className="overflow-x-auto">
  //           <table className="w-full">
  //             <thead>
  //               <tr className="border-b border-gray-700">
  //                 <th className="text-left p-4 text-gray-400 font-medium">
  //                   <input
  //                     type="checkbox"
  //                     className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-2"
  //                   />
  //                 </th>
  //                 <th className="text-left p-4 text-gray-400 font-medium">Status</th>
  //                 <th className="text-left p-4 text-gray-400 font-medium">Print Date</th>
  //                 <th className="text-left p-4 text-gray-400 font-medium">STL file</th>
  //                 <th className="text-left p-4 text-gray-400 font-medium"></th>
  //               </tr>
  //             </thead>
  //             <tbody>
  //               {filteredPrints.map((job) => (
  //                 <tr
  //                   key={job.id}
  //                   className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
  //                 >
  //                   <td className="p-4">
  //                     <input
  //                       type="checkbox"
  //                       checked={selectedPrints.includes(job.id)}
  //                       onChange={() => handleCheckboxChange(job.id)}
  //                       className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-2"
  //                     />
  //                   </td>
  //                   <td className="p-4">
  //                     <div className="flex items-center gap-2">
  //                       {getStatusIcon(job.status)}
  //                       <span className="text-white">{job.status}</span>
  //                     </div>
  //                   </td>
  //                   <td className="p-4 text-white">{job.printDate}</td>
  //                   <td className="p-4">
  //                     <button
  //                       onClick={() => handleDownload(job.fileName)}
  //                       className="text-purple-400 hover:text-purple-300 underline transition-colors"
  //                     >
  //                       {job.stlFile}
  //                     </button>
  //                   </td>
  //                   <td className="p-4">
  //                     <button
  //                       onClick={() => handleDownload(job.fileName)}
  //                       className="text-gray-400 hover:text-white transition-colors"
  //                     >
  //                       <Download className="w-4 h-4" />
  //                     </button>
  //                   </td>
  //                 </tr>
  //               ))}
  //             </tbody>
  //           </table>
  //         </div>
  //       </div>
  //     </main>
  //   </div>
  // );
}
