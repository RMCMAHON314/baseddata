import GapFixerDashboard from '@/components/saturation/GapFixerDashboard';
import { PageSEO } from '@/components/layout/PageSEO';

const GapFixer = () => {
  return (
    <>
      <PageSEO title="Gap Fixer" description="Identify and fill data coverage gaps." path="/gap-fixer" noindex />
      <GapFixerDashboard />
    </>
  );
};

export default GapFixer;
