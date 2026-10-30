import AuthGate from "./AuthGate";
import Jo1MasterPlatform from "./Jo1MasterPlatform";

export default function Page() {
  return <AuthGate><Jo1MasterPlatform /></AuthGate>;
}
