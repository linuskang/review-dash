import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { gh } from "@/lib/github";
import { getSession } from "@/lib/session";

export default async function Home() {
    const session = await getSession();
    if (!session) redirect("/login");
    const check = await gh(session.token, "/user");
    if (check.status === 401) redirect("/login?error=expired");
    return <Dashboard />;
}