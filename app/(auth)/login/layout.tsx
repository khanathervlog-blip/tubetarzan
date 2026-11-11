import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Log in",
  description: "Log in to TubeTarzan to find viral YouTube video ideas.",
  path: "/login",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
