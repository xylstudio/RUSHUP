export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-orange-500 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold">Rider App</h1>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-400 rounded-full"></span>
          <span className="text-sm font-medium">Online</span>
        </div>
      </header>
      <main className="flex-1 w-full max-w-md mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
