import React from 'react';
import { useAppContext, Environment } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function EnvironmentSelector() {
  const { environment, setEnvironment } = useAppContext();

  const envConfig: Record<Environment, { label: string; color: string }> = {
    development: { label: 'Dev', color: 'text-blue-500 bg-blue-500/10' },
    staging: { label: 'Stage', color: 'text-amber-500 bg-amber-500/10' },
    production: { label: 'Prod', color: 'text-green-500 bg-green-500/10' }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={environment}
        onChange={(e) => setEnvironment(e.target.value as Environment)}
        className={cn(
          "text-[10px] font-mono px-2 py-1 rounded border cursor-pointer transition-colors",
          envConfig[environment].color,
          "border-transparent hover:border-border-hover"
        )}
      >
        <option value="development">Development</option>
        <option value="staging">Staging</option>
        <option value="production">Production</option>
      </select>
    </div>
  );
}