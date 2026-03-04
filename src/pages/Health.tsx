// Health Check Page
import SystemHealthCheck from '@/components/health/SystemHealthCheck';
import { PageSEO } from '@/components/layout/PageSEO';

export default function Health() {
  return (
    <>
      <PageSEO title="System Health" description="Real-time health status of BasedData's data pipeline, API sources, and infrastructure." path="/health" />
      <SystemHealthCheck />
    </>
  );
}
