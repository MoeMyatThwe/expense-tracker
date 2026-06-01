"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { OperationModal } from "@/components/operation-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseCardSkeleton } from "@/components/loading-states";

interface Family {
  id: string;
  name: string;
  ownerId: string;
  owner: { id: string; email: string };
  members: Array<{ id: string; email: string }>;
}

interface Membership {
  status: "active" | "inactive" | "cancelled";
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export default function FamilyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "members">("overview");
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [isJoinFamilyOpen, setIsJoinFamilyOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationModal, setOperationModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    memberId: string;
    memberEmail: string;
  } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        await fetchMembership(authUser);
        await fetchFamily(authUser);
      } else {
        router.push("/auth");
      }
    };

    initUser();
  }, [router]);

  const fetchMembership = async (authUser: any) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) return;

      const res = await fetch("/api/stripe/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMembership(data.membership || null);
      }
    } catch (error) {
      console.error("Error fetching membership:", error);
    }
  };

  const fetchFamily = async (authUser: any) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) return;

      const res = await fetch("/api/families", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setFamily(json.family || null);
      }
    } catch (error) {
      console.error("Error fetching family:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setOperationModal({
        type: "error",
        title: "Invalid Input",
        message: "Family name cannot be empty",
      });
      return;
    }

    if (!membership || membership.status !== "active") {
      setOperationModal({
        type: "error",
        title: "Premium Required",
        message:
          "Family feature is only available for premium members. Please upgrade to continue.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/families", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: familyName.trim() }),
      });

      if (res.ok) {
        const newFamily = await res.json();
        setFamily(newFamily);
        setFamilyName("");
        setIsCreateFamilyOpen(false);
        setOperationModal({
          type: "success",
          title: "Family Created",
          message: `Successfully created "${newFamily.name}". You can now invite family members!`,
        });
      } else {
        const error = await res.json();
        setOperationModal({
          type: "error",
          title: "Failed to Create Family",
          message: error.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error("Error creating family:", error);
      setOperationModal({
        type: "error",
        title: "Error",
        message: "Failed to create family. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setOperationModal({
        type: "error",
        title: "Invalid Input",
        message: "Email cannot be empty",
      });
      return;
    }

    if (!family) return;

    if (!membership || membership.status !== "active") {
      setOperationModal({
        type: "error",
        title: "Premium Required",
        message: "Family feature is only available for premium members.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(`/api/families/${family.id}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: memberEmail.trim() }),
      });

      if (res.ok) {
        setMemberEmail("");
        setIsJoinFamilyOpen(false);
        // Refetch family
        const refetchRes = await fetch(`/api/families/${family.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refetchRes.ok) {
          const updatedFamily = await refetchRes.json();
          setFamily(updatedFamily.family);
        }
        setOperationModal({
          type: "success",
          title: "Member Added",
          message: `${memberEmail} has been added to your family!`,
        });
      } else {
        const error = await res.json();
        setOperationModal({
          type: "error",
          title: "Failed to Add Member",
          message: error.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error("Error adding member:", error);
      setOperationModal({
        type: "error",
        title: "Error",
        message: "Failed to add member. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!family) return;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(
        `/api/families/${family.id}/members/${memberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        // Refetch family
        const refetchRes = await fetch(`/api/families/${family.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refetchRes.ok) {
          const updatedFamily = await refetchRes.json();
          setFamily(updatedFamily.family);
        }
        setConfirmRemove(null);
        setOperationModal({
          type: "success",
          title: "Member Removed",
          message: "Family member has been removed successfully",
        });
      } else {
        const error = await res.json();
        setOperationModal({
          type: "error",
          title: "Failed to Remove Member",
          message: error.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      setOperationModal({
        type: "error",
        title: "Error",
        message: "Failed to remove member. Please try again.",
      });
    }
  };

  const handleLeaveFamily = async () => {
    if (!family) return;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(`/api/families/${family.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFamily(null);
        setConfirmLeave(false);
        setOperationModal({
          type: "success",
          title: "Left Family",
          message: "You have left the family successfully",
        });
      } else {
        const error = await res.json();
        setOperationModal({
          type: "error",
          title: "Failed to Leave",
          message: error.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error("Error leaving family:", error);
      setOperationModal({
        type: "error",
        title: "Error",
        message: "Failed to leave family. Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  // Premium gate
  if (!membership || membership.status !== "active") {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Family Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your family group and shared expenses
              </p>
            </div>

            <Card className="p-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-blue-100 rounded-full p-4">
                    <Lock className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-blue-900">
                  Premium Feature
                </h2>
                <p className="text-blue-800 max-w-md mx-auto">
                  Family sharing is a premium feature. Upgrade your account to start
                  sharing expenses with family members.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => router.push("/profile")}
                    style={{
                      backgroundImage: `url('/assets/cinamoroll_theme/background/bg_stripes.jpg')`,
                      backgroundSize: "300%",
                      backgroundPosition: "center",
                    }}
                    className="text-slate-700 hover:opacity-90"
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#E1EDFD] to-[#F0F7FF]">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          {/* Header Card */}
          <Card className="mb-6 p-6 bg-gradient-to-r from-[#B2D7FF] to-[#D4E5F7] border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-full p-3">
                  <Users className="w-6 h-6 text-[#859BB2]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#334155]">Family</h1>
                  <p className="text-sm text-[#859BB2]">
                    Manage your family group and shared expenses
                  </p>
                </div>
              </div>
              {family && user?.id === family.ownerId && (
                <Button
                  onClick={() => setIsJoinFamilyOpen(true)}
                  className="bg-white text-[#859BB2] hover:bg-gray-50 font-semibold"
                >
                  + Add Member
                </Button>
              )}
            </div>
          </Card>

          {/* Tabs */}
          {family && (
            <div className="mb-6 flex gap-2 border-b border-[#D4E5F7] bg-white rounded-t-xl p-4">
              {(["overview", "members"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium text-sm rounded-lg transition ${
                    activeTab === tab
                      ? "bg-[#B2D7FF] text-[#334155] shadow-sm"
                      : "text-[#859BB2] hover:bg-slate-50"
                  }`}
                >
                  {tab === "overview" ? "Overview" : "Members"}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {!family ? (
            <Card className="p-16 text-center bg-white">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src="/assets/cinamoroll_theme/App Logo/profile.png"
                    alt="empty"
                    className="w-24 h-24 opacity-50"
                  />
                </div>
                <h2 className="text-xl font-semibold text-[#334155]">
                  You don't have a family yet
                </h2>
                <p className="text-[#859BB2]">
                  Create a family to start sharing expenses with family members
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => setIsCreateFamilyOpen(true)}
                    className="bg-[#B2D7FF] text-[#334155] hover:bg-[#9AC4E7] font-semibold"
                  >
                    Create Family
                  </Button>
                </div>
              </div>
            </Card>
          ) : activeTab === "overview" ? (
            <Card className="p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#859BB2] mb-1">Family Name</p>
                  <h2 className="text-2xl font-bold text-[#334155]">
                    {family.name}
                  </h2>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-[#859BB2] mb-3">
                    {family.members.length} member{family.members.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {family.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#F0F7FF] text-sm"
                      >
                        <p className="text-[#334155] font-medium">{member.email}</p>
                        {member.id === family.ownerId && (
                          <span className="text-xs bg-[#D4E5F7] text-[#859BB2] px-2 py-1 rounded">
                            Owner
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-4">
                  {user?.id !== family.ownerId && (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmLeave(true)}
                      className="w-full"
                    >
                      Leave Family
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-white">
              <div className="space-y-4">
                <h3 className="font-semibold text-[#334155]">Family Members</h3>
                <div className="space-y-2">
                  {family.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#F0F7FF]"
                    >
                      <div>
                        <p className="font-medium text-[#334155] text-sm">
                          {member.email}
                        </p>
                        {member.id === family.ownerId && (
                          <p className="text-xs text-[#859BB2]">Owner</p>
                        )}
                      </div>
                      {member.id !== family.ownerId && user?.id === family.ownerId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setConfirmRemove({
                              memberId: member.id,
                              memberEmail: member.email,
                            })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Family Modal */}
      <Dialog open={isCreateFamilyOpen} onOpenChange={setIsCreateFamilyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Family</DialogTitle>
            <DialogDescription>
              Give your family a name to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="family-name">Family Name</Label>
              <Input
                id="family-name"
                placeholder="e.g., The Smiths"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateFamilyOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFamily}
                disabled={isSubmitting}
                className="bg-[#B2D7FF] text-[#334155] hover:bg-[#9AC4E7] font-semibold"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={isJoinFamilyOpen} onOpenChange={setIsJoinFamilyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Enter the email of the person you want to add
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="member-email">Member Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="john@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsJoinFamilyOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={isSubmitting}
                className="bg-[#B2D7FF] text-[#334155] hover:bg-[#9AC4E7] font-semibold"
              >
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <ConfirmationModal
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="Remove Family Member?"
        description={`Are you sure you want to remove ${confirmRemove?.memberEmail} from the family? They will no longer have access to shared expenses.`}
        confirmText="Remove"
        isDangerous
        onConfirm={() => {
          if (confirmRemove) {
            handleRemoveMember(confirmRemove.memberId);
          }
        }}
      />

      {/* Leave Family Confirmation */}
      <ConfirmationModal
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave Family?"
        description="You will no longer have access to shared family expenses. You can rejoin if invited."
        confirmText="Leave"
        isDangerous
        onConfirm={handleLeaveFamily}
      />

      {/* Operation Modal */}
      {operationModal && (
        <OperationModal
          open={!!operationModal}
          onOpenChange={(open) => !open && setOperationModal(null)}
          type={operationModal.type}
          title={operationModal.title}
          message={operationModal.message}
          onClose={() => setOperationModal(null)}
        />
      )}
    </>
  );
}
