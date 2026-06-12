import { cookies } from "next/headers";
import LoginForm from "./LoginForm";


export default async function LoginPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "zh";
  
  return <LoginForm lang={lang} />;
}
