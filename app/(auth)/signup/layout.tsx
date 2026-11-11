import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Sign up free",
  description: "Create a free TubeTarzan account: find viral YouTube video ideas with outlier scores and VPH in 60 seconds.",
  path: "/signup",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
