"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import MyProfile from "@/views/MyProfile";

export default function ProfilePage() {
  return (
    <PermissionGuard required="my_profile">
      <MyProfile />
    </PermissionGuard>
  );
}
