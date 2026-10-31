import { LoginView } from "@/components/auth/login-view";
import "./auth-theme.css";

export const metadata = {
  title: "Sign In • NexDrop",
  description: "Sign in to open your NexDrop courier, dispatch, and delivery workspace.",
};

export default function LoginPage() {
  return <LoginView />;
}
