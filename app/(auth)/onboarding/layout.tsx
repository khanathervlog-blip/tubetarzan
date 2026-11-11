import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Get started",
  description: "Set up your TubeTarzan account.",
  path: "/onboarding",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
