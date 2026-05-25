import { Shield, Battery, Activity, Bell } from 'lucide-react';
import { Card, Button } from '@/components/ui';

const checks = [
  {
    id: '1',
    title: 'Allow access',
    description: 'Ensure the app has been granted necessary permissions on the target device.',
    icon: Shield,
    status: 'ok',
  },
  {
    id: '2',
    title: 'Battery optimization',
    description: 'Disable battery optimization for Majeeds Guard System so it can run in the background.',
    icon: Battery,
    status: 'warning',
  },
  {
    id: '3',
    title: 'Usage access',
    description: 'Grant usage access to monitor app usage and screen time.',
    icon: Activity,
    status: 'ok',
  },
  {
    id: '4',
    title: 'Notifications',
    description: 'Allow notification access to sync messages and alerts.',
    icon: Bell,
    status: 'pending',
  },
];

export function PermissionsCheck() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#e5ffe5]">Troubleshoot</h1>
      <p className="text-slate-400">
        Use the following checks to ensure Majeeds Guard System is working correctly on the target device.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="flex flex-col">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.status === 'ok'
                      ? 'bg-emerald-100'
                      : item.status === 'warning'
                        ? 'bg-amber-100'
                        : 'bg-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      item.status === 'ok'
                        ? 'text-emerald-400'
                        : item.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#e5ffe5]">{item.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    {item.status === 'pending' ? 'Configure' : 'Check'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
