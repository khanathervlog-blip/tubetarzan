import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Update password",
  description: "Set a new TubeTarzan password.",
  path: "/update-password",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
