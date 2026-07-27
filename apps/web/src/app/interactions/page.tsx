import { redirect } from "next/navigation";

import { archiveTimelinePattern } from "~/components/interactions";

export default function InteractionsPage() {
  redirect(`/interactions/${archiveTimelinePattern.slug}`);
}
