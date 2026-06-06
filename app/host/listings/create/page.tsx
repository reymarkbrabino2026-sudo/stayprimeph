import { redirect } from "next/navigation";

export default function CreateListingPage() {
  redirect("/become-a-host/setup?new=1");
}

