import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/admin/DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: branches } = await supabase.from('branches').select('id, name');

  const branchesMap = (branches || []).reduce((acc, b: any) => {
    acc[b.id] = b.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <DashboardClient
      branchesMap={branchesMap}
      initialBranchesCount={branches?.length || 0}
    />
  );
}
