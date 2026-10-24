"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgePercent, Loader2, Plus, Save } from "lucide-react";
import { Button, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getAdminPromotions,
  saveAdminPromotion,
  type AdminPromotion,
} from "@/lib/services/admin-platform.api";

const blank: Omit<AdminPromotion, "_id"> = {
  code: "",
  name: "",
  razorpayOfferId: "",
  accountTypes: ["BUSINESS", "AGENCY"],
  planCodes: [],
  productIds: [],
  billingIntervals: ["monthly", "yearly"],
  durationCycles: 1,
  active: true,
};

const csv = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

export default function PromotionsPage() {
  const { apiRequest } = useApi();
  const { styles } = useThemeStyles();
  const [items, setItems] = useState<AdminPromotion[]>([]);
  const [form, setForm] = useState<Omit<AdminPromotion, "_id">>(blank);
  const [editingId, setEditingId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getAdminPromotions(apiRequest)); }
    catch (error: any) { toast({ title: "Unable to load coupons", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [apiRequest]);

  useEffect(() => void load(), [load]);

  const save = async () => {
    setSaving(true);
    try {
      await saveAdminPromotion(apiRequest, form, editingId);
      toast({ title: editingId ? "Coupon updated" : "Coupon created" });
      setEditingId(undefined);
      setForm(blank);
      await load();
    } catch (error: any) {
      toast({ title: "Unable to save coupon", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className={`${styles.page} p-5 md:p-8`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3"><BadgePercent className="h-7 w-7 text-amber-500" /><div><h1 className={`text-2xl font-bold ${styles.text.primary}`}>Coupons</h1><p className={styles.text.secondary}>Map customer coupon codes to Razorpay Offers.</p></div></div>
        <div className={`mt-6 rounded-2xl p-5 ${styles.card}`}>
          <p className={`text-sm ${styles.text.secondary}`}>Create the Offer in Razorpay first. Its configuration controls the percentage/fixed discount and how many billing cycles receive it.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className={styles.input} placeholder="Coupon code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <input className={styles.input} placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={styles.input} placeholder="Razorpay Offer ID" value={form.razorpayOfferId} onChange={(e) => setForm({ ...form, razorpayOfferId: e.target.value })} />
            <input className={styles.input} placeholder="Plan codes, comma separated" value={form.planCodes.join(", ")} onChange={(e) => setForm({ ...form, planCodes: csv(e.target.value) })} />
            <input className={styles.input} placeholder="Product IDs, comma separated" value={form.productIds.join(", ")} onChange={(e) => setForm({ ...form, productIds: csv(e.target.value) })} />
            <input className={styles.input} type="number" min={1} max={120} placeholder="Discounted cycles" value={form.durationCycles || 1} onChange={(e) => setForm({ ...form, durationCycles: Number(e.target.value) || 1 })} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {(["BUSINESS", "AGENCY"] as const).map((type) => <label key={type} className="flex items-center gap-2"><input type="checkbox" checked={form.accountTypes.includes(type)} onChange={(e) => setForm({ ...form, accountTypes: e.target.checked ? [...form.accountTypes, type] : form.accountTypes.filter((item) => item !== type) })} />{type}</label>)}
            {(["monthly", "yearly"] as const).map((cycle) => <label key={cycle} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={form.billingIntervals.includes(cycle)} onChange={(e) => setForm({ ...form, billingIntervals: e.target.checked ? [...form.billingIntervals, cycle] : form.billingIntervals.filter((item) => item !== cycle) })} />{cycle}</label>)}
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label>
          </div>
          <Button className="mt-4 bg-amber-500 text-white" disabled={saving || !form.code || !form.name || !form.razorpayOfferId} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{editingId ? "Update coupon" : "Create coupon"}</Button>
        </div>
        <div className="mt-6 space-y-3">
          {loading ? <p className={styles.text.secondary}>Loading coupons…</p> : items.map((item) => <button key={item._id} className={`w-full rounded-2xl p-4 text-left ${styles.card}`} onClick={() => { setEditingId(item._id); setForm({
            code: item.code,
            name: item.name,
            razorpayOfferId: item.razorpayOfferId,
            accountTypes: item.accountTypes,
            planCodes: item.planCodes,
            productIds: item.productIds,
            billingIntervals: item.billingIntervals,
            durationCycles: item.durationCycles,
            validFrom: item.validFrom,
            validUntil: item.validUntil,
            active: item.active,
          }); }}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className={`font-bold ${styles.text.primary}`}>{item.code} · {item.name}</p><p className={`mt-1 text-xs ${styles.text.secondary}`}>{item.razorpayOfferId} · {item.durationCycles || "Razorpay configured"} cycle(s)</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.active ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-500"}`}>{item.active ? "Active" : "Inactive"}</span></div></button>)}
        </div>
      </div>
    </div>
  );
}
