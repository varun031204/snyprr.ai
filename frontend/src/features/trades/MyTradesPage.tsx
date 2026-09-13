import React from 'react';
import { Briefcase } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';

const MyTradesPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Trades</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">View your current and past trades.</p>
        </div>
      </div>
      
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <EmptyState
          icon={<Briefcase className="w-12 h-12 text-[var(--brand-primary)] opacity-80" />}
          title="No Trades Found"
          description="You haven't made any trades yet. Your active and past trades will appear here."
        />
      </div>
    </div>
  );
};

export default MyTradesPage;
