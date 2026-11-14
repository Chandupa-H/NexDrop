import { CustomerProfileAccount } from "@/features/customers/components/CustomerProfileAccount";

export const metadata = {
  title: "Customer Profile - NexDrop",
  description: "View and manage your NexDrop customer profile and address preferences.",
};

export default function CustomerProfilePage() {
  return <CustomerProfileAccount />;
}
