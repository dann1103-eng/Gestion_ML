import { redirect } from "next/navigation";

export default function Redir() {
  redirect("/control?vista=numerarios");
}
