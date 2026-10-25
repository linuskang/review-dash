import Dashboard from "@/components/dashboard";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { gh } from "@/lib/github";

export default async function Home() {
    const session = await getSession();
    if (!session) redirect("/login?error=expired");
    const check = await gh(session.token, "/user");
    if (check.status === 401) redirect("/login?error=expired");
    return <Dashboard />;
}