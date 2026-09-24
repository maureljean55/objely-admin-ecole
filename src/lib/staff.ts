"use client";

import { getSupabase } from "./auth";
import { refresh } from "./store";
import { createStaffAccount, deleteStaffAccount, resetStaffPassword, type StaffCredentials, type StaffResult } from "./server/staff";
import type { StaffRole } from "./types";

// Calls the server actions with the signed-in person's access token, then refreshes the staff list.
async function token(): Promise<string> {
  const { data } = await getSupabase()!.auth.getSession();
  return data.session?.access_token ?? "";
}

export async function createStaff(input: { name: string; email: string; role: StaffRole }): Promise<StaffResult<{ credentials: StaffCredentials }>> {
  const result = await createStaffAccount(await token(), input);
  if (result.ok) await refresh("staff", "log");
  return result;
}

export async function resetPassword(memberId: string): Promise<StaffResult<{ credentials: StaffCredentials }>> {
  return resetStaffPassword(await token(), memberId);
}

export async function deleteStaff(memberId: string): Promise<StaffResult> {
  const result = await deleteStaffAccount(await token(), memberId);
  if (result.ok) await refresh("staff", "log");
  return result;
}

export type { StaffCredentials };
