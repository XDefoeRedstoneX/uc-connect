import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("user_id,balance_idr,updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: transactions, error: txError } = await supabase
        .from("wallet_transactions")
        .select("id,type,amount_idr,balance_after,reference,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (txError) return sendInternalServerError(res, "Gagal memuat dompet", txError);

      return res.status(200).json({
        balance_idr: wallet?.balance_idr ?? 0,
        transactions: transactions ?? [],
      });
    },
  }),
});
