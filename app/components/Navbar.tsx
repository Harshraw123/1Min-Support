import { getSession } from "@/lib/getSession";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getSession();
  return <NavbarClient user={user} />;
}