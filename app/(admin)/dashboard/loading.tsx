import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Users, MapPin, IndianRupee, Activity } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle><div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded"></div></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full bg-gray-100 dark:bg-gray-800/50 rounded-lg"></div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle><div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div></CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
