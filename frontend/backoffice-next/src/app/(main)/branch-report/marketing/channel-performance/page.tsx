import { redirect } from "next/navigation";

/** Legacy route — bookmarks / sidebar cache from before marketing segment was dropped. */
export default function ChannelPerformanceLegacyRedirect() {
  redirect("/branch-report/channel-performance");
}
