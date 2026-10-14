export function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white py-8 text-sm text-[#64748B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#064E3B]">NexDrop</span>
          <span>&copy; 2026 — University Enterprise Application Development</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#64748B]">
          <span>Modular Monolith</span>
          <span>FastAPI + Next.js App Router</span>
          <span>Neon PostgreSQL</span>
          <span>RabbitMQ</span>
        </div>
      </div>
    </footer>
  );
}
