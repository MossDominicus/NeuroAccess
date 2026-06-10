import { cookies } from "next/headers";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "zh";
  
  return <RegisterForm lang={lang} />;
}
