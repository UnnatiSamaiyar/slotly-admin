import { PlaceholderPage } from "../components/admin/PlaceholderPage";
import { adminModules } from "../data/admin/modules";

const page = adminModules.notifications;

export default function NotificationsPage() {
  return <PlaceholderPage {...page} />;
}
