import Spinner from '@/components/ui/Spinner';

export default function MyAttendanceLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner />
    </div>
  );
}
