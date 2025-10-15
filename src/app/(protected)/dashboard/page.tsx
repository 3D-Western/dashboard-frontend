'use client';

import { useState } from 'react';
import { User, Download, Filter, CheckCircle, Clock, Printer } from 'lucide-react';

interface PrintJob {
  id: number;
  status: 'Completed' | 'In queue...' | 'Printing...';
  printDate: string;
  stlFile: string;
  fileName: string;
}

const Dashboard: React.FC = () => {
  const [filterText, setFilterText] = useState<string>('');
  const [selectedPrints, setSelectedPrints] = useState<number[]>([]);

  const printJobs: PrintJob[] = [
    {
      id: 1,
      status: 'Completed',
      printDate: '3/3/2027',
      stlFile: 'jeff_the_shark.stl',
      fileName: 'jeff_the_shark.stl',
    },
    {
      id: 2,
      status: 'In queue...',
      printDate: 'In progress',
      stlFile: 'bulbasaur.stl',
      fileName: 'bulbasaur.stl',
    },
    {
      id: 3,
      status: 'Printing...',
      printDate: '3/3/2027',
      stlFile: 'bulbasaur.stl',
      fileName: 'bulbasaur.stl',
    },
  ];

  const filteredPrints = printJobs.filter((job) =>
    job.fileName.toLowerCase().includes(filterText.toLowerCase()),
  );

  const handleCheckboxChange = (id: number) => {
    setSelectedPrints((prev) =>
      prev.includes(id) ? prev.filter((printId) => printId !== id) : [...prev, id],
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'In queue...':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'Printing...':
        return <Printer className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    // Logout functionality would go here
    console.log('Logging out...');
  };

  const handleNewPrint = () => {
    // New print functionality would go here
    console.log('Creating new print...');
  };

  const handleDownload = (fileName: string) => {
    // Download functionality would go here
    console.log(`Downloading ${fileName}...`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <button
          onClick={handleLogout}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Logout
        </button>

        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Welcome,</h1>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Simon</h1>
        </div>

        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-gray-300" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-6 container">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
          {/* Prints Section Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Prints</h2>
              <p className="text-gray-400 text-sm">Manage your prints</p>
            </div>
            <button
              onClick={handleNewPrint}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              New Print
            </button>
          </div>

          {/* Filter */}
          <div className="p-6 border-b border-gray-700">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by name..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                  </th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Print Date</th>
                  <th className="text-left p-4 text-gray-400 font-medium">STL file</th>
                  <th className="text-left p-4 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPrints.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedPrints.includes(job.id)}
                        onChange={() => handleCheckboxChange(job.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-2"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-white">{job.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white">{job.printDate}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDownload(job.fileName)}
                        className="text-purple-400 hover:text-purple-300 underline transition-colors"
                      >
                        {job.stlFile}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDownload(job.fileName)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
