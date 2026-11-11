import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Reset password",
  description: "Reset your TubeTarzan password.",
  path: "/reset-password",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
