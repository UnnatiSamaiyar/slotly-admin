import { PlaceholderPage } from "../../components/admin/PlaceholderPage";
import { adminModules } from "../../data/admin/modules";

const page = adminModules.auditLogs;

export default function AuditLogsPage() {
  return <PlaceholderPage {...page} />;
}
