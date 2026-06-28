export default function StaffHistory() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light tracking-tight text-[#1A1A1A]">Work History</h1>
      
      <div className="bg-white rounded-lg border border-[#E5E5DF]">
        <div className="p-6 border-b border-[#E5E5DF]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Completed Tasks</h2>
            <div className="flex space-x-2">
              <select className="px-3 py-2 border border-[#E5E5DF] rounded-md bg-white text-[#1A1A1A]">
                <option>All Time</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Year</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border border-[#E5E5DF] rounded-lg bg-white">
              <div className="flex-1">
                <h3 className="font-semibold text-[#1A1A1A]">Lawn Care - 123 Main Street</h3>
                <p className="text-sm text-[#70706B]">Completed on March 15, 2024</p>
                <p className="text-sm text-[#70706B]">Duration: 2 hours</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-[#F7F7F2] text-[#1A1A1A] border border-[#E5E5DF] rounded-full text-sm">
                  Completed
                </span>
                <p className="text-sm text-[#70706B] mt-1">$150.00</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 border border-[#E5E5DF] rounded-lg bg-white">
              <div className="flex-1">
                <h3 className="font-semibold text-[#1A1A1A]">Tree Trimming - 456 Oak Avenue</h3>
                <p className="text-sm text-[#70706B]">Completed on March 12, 2024</p>
                <p className="text-sm text-[#70706B]">Duration: 4 hours</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-[#F7F7F2] text-[#1A1A1A] border border-[#E5E5DF] rounded-full text-sm">
                  Completed
                </span>
                <p className="text-sm text-[#70706B] mt-1">$600.00</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 border border-[#E5E5DF] rounded-lg bg-white">
              <div className="flex-1">
                <h3 className="font-semibold text-[#1A1A1A]">Garden Design - 789 Pine Street</h3>
                <p className="text-sm text-[#70706B]">Completed on March 8, 2024</p>
                <p className="text-sm text-[#70706B]">Duration: 6 hours</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-[#F7F7F2] text-[#1A1A1A] border border-[#E5E5DF] rounded-full text-sm">
                  Completed
                </span>
                <p className="text-sm text-[#70706B] mt-1">$900.00</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-[#E5E5DF] bg-white">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#1A1A1A]">Total Earnings This Month</span>
            <span className="text-2xl font-bold text-[#1A1A1A]">$1,650.00</span>
          </div>
        </div>
      </div>
    </div>
  )
} 