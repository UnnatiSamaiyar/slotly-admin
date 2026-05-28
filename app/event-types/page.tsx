import { PlaceholderPage } from "../../components/admin/PlaceholderPage";
import { adminModules } from "../../data/admin/modules";

const page = adminModules.eventTypes;

export default function EventTypesPage() {
  return <PlaceholderPage {...page} />;
}
