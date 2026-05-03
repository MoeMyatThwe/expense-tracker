"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Edit2, Menu, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import {
  CATEGORY_ICONS,
  formatCategoryIconName,
  formatCategoryName,
  type CategoryOption,
} from "@/lib/category-options";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useLanguage } from "@/components/language-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CinnamorollLoader } from "@/components/loading-states";

export default function CategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [editingCategory, setEditingCategory] =
    useState<CategoryOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCategories();
    }
  }, [authLoading, user]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token;
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load categories");
      }

      setCategories(await response.json());
    } catch (error) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        editingCategory?.id
          ? `/api/categories/${editingCategory.id}`
          : "/api/categories",
        {
          method: editingCategory?.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, icon }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save category");
      }

      setName("");
      setIcon(CATEGORY_ICONS[0]);
      setEditingCategory(null);
      toast.success(editingCategory ? "Category updated" : "Category created");
      await fetchCategories();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditingCategory = (category: CategoryOption) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
    setName("");
    setIcon(CATEGORY_ICONS[0]);
  };

  const deleteCategory = async (id?: string) => {
    if (!id) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      setCategories((current) => current.filter((category) => category.id !== id));
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CinnamorollLoader label={t("loadingCategories")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-3xl border-2 border-[#D4E5F7] bg-cover bg-center p-6 shadow-lg"
          style={{
            backgroundImage:
              "url('/assets/cinamoroll_theme/background/CategoryBannerBackground.png')",
          }}
        >
          <div>
            <h1 className="text-3xl font-bold text-[#859BB2]">
              {t("categoriesTitle")}
            </h1>
            <p className="text-sm text-gray-600">
              {t("categoriesSubtitle")}
            </p>
          </div>
        </motion.div>

        <form
          onSubmit={saveCategory}
          className="cinnamoroll-card mb-6 grid gap-4 p-5 md:grid-cols-[1fr_220px_auto] md:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="category-name">{t("categoryName")}</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., skincare"
              className="rounded-xl border-[#D4E5F7]"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("icon")}</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="rounded-xl border-[#D4E5F7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ICONS.map((iconName) => (
                  <SelectItem
                    key={iconName}
                    value={iconName}
                    className="rounded-lg focus:bg-[#E1EDFD] focus:text-[#859BB2] data-[state=checked]:bg-[#E1EDFD] data-[state=checked]:text-[#859BB2]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CategoryIcon
                        name={iconName}
                        className="h-4 w-4 text-[#859BB2]"
                      />
                      {formatCategoryIconName(iconName)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="cinnamoroll-button bg-[#B2D7FF] text-white hover:bg-[#859BB2]"
          >
            {editingCategory ? (
              <Edit2 className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving ? t("saving") : editingCategory ? t("update") : t("add")}
          </Button>
          {editingCategory && (
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditingCategory}
              className="cinnamoroll-button border-[#D4E5F7] text-[#859BB2] hover:bg-[#D4E5F7] hover:text-[#859BB2] md:col-start-3"
            >
              <X className="h-4 w-4" />
              {t("cancel")}
            </Button>
          )}
        </form>

        {loading ? (
          <CinnamorollLoader label={t("loadingCategories")} />
        ) : categories.length === 0 ? (
          <EmptyState
            title={t("noCategoriesYet")}
            description={t("noCategoriesDesc")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {categories.map((category) => (
              <Card
                key={category.id || category.name}
                className="rounded-2xl border border-[#D4E5F7] bg-white/80 py-0 shadow-sm backdrop-blur-sm"
              >
                <CardContent className="flex h-16 items-center justify-between gap-2 p-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <CategoryIcon name={category.icon} className="h-9 w-9" />
                    </div>
                    <h2 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {formatCategoryName(category.name)}
                    </h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl text-[#859BB2] hover:bg-[#E1EDFD] hover:text-[#859BB2]"
                        title="Category actions"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={() => startEditingCategory(category)}
                        className="rounded-lg text-[#859BB2] focus:bg-[#E1EDFD] focus:text-[#859BB2]"
                      >
                        <Edit2 className="h-4 w-4" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteCategory(category.id)}
                        className="rounded-lg text-[#859BB2] focus:bg-[#E1EDFD] focus:text-[#859BB2]"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
