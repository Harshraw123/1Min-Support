import { type SessionUser } from "@/lib/getSession";
import NavbarClient from "./NavbarClient";

interface NavbarProps {
  user: SessionUser | null;
}

export default function Navbar({ user }: NavbarProps) {
  return <NavbarClient user={user} />;
}