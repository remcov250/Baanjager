export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-sm px-4 pt-16">{children}</main>;
}
