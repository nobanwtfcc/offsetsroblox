import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  listOffsets,
  upsertOffset,
  deleteOffset,
  isCurrentUserAdmin,
  type OffsetRow,
} from "@/lib/offsets.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Roblox Offsets" }] }),
  component: AdminPage,
});

const empty = { id: "", name: "", address: "", category: "General", notes: "", sort_order: 0 };

function AdminPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const fetchOffsets = useServerFn(listOffsets);
  const save = useServerFn(upsertOffset);
  const remove = useServerFn(deleteOffset);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth" });
      else setReady(true);
    });
  }, [nav]);

  const adminQ = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => checkAdmin(),
    enabled: ready,
  });

  const offsetsQ = useQuery({
    queryKey: ["offsets"],
    queryFn: () => fetchOffsets(),
    enabled: ready,
  });

  const [form, setForm] = useState(empty);

  if (!ready) return null;
  if (adminQ.data && !adminQ.data.isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="max-w-xl mx-auto px-6 py-20 text-center">
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="text-muted-foreground mt-2 mono text-sm">
            Your account is not an admin.
          </p>
        </main>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          address: form.address,
          category: form.category || "General",
          notes: form.notes || null,
          sort_order: Number(form.sort_order) || 0,
        },
      });
      toast.success(form.id ? "Updated" : "Created");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["offsets"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this offset?")) return;
    try {
      await remove({ data: { id } });
      qc.invalidateQueries({ queryKey: ["offsets"] });
      toast.success("Deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const offsets = (offsetsQ.data?.offsets ?? []) as OffsetRow[];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-[1fr_360px] gap-8">
        <section>
          <h1 className="text-2xl font-semibold mb-4">Manage offsets</h1>
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            {offsets.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No offsets yet — add one →</p>
            )}
            {offsets.map((o, i) => (
              <div
                key={o.id}
                className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border/40" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="mono text-sm truncate">{o.name}</div>
                  <div className="text-xs text-muted-foreground mono">
                    {o.category} • {o.address}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      id: o.id,
                      name: o.name,
                      address: o.address,
                      category: o.category,
                      notes: o.notes ?? "",
                      sort_order: o.sort_order,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(o.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border border-border/60 bg-card/60 p-5 h-fit md:sticky md:top-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold mono text-sm flex items-center gap-2">
              {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {form.id ? "Edit offset" : "New offset"}
            </h2>
            {form.id && (
              <button onClick={() => setForm(empty)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="DataModel"
                className="mono"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="0x1A2B3C4"
                className="mono"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="General"
                className="mono"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <Button type="submit" className="w-full">
              {form.id ? "Save changes" : "Add offset"}
            </Button>
          </form>
        </aside>
      </main>
    </div>
  );
}