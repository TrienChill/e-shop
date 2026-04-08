import { useAuth } from "@/src/auth/AuthContext";
import { listAllVouchers, setVoucherActive, type VoucherRow } from "@/src/services/admin/vouchers";
import React from "react";
import { Platform } from "react-native";

export default function AdminVouchersScreen() {
  const { role } = useAuth();
  const [rows, setRows] = React.useState<VoucherRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return listAllVouchers()
      .then(setRows)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  if (role !== "admin") {
    return Platform.OS === "web" ? (
      <div className="p-6 rounded-2xl bg-white border border-gray-200">
        <h1 className="text-lg font-bold">Voucher</h1>
        <p className="mt-2 text-gray-600">Bạn không có quyền quản lý voucher.</p>
      </div>
    ) : null;
  }

  if (Platform.OS !== "web") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Voucher</h1>
        <button
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold"
          onClick={() => refresh()}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-100">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Value</th>
              <th className="text-left px-4 py-3">Expired</th>
              <th className="text-left px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs">{v.code ?? "-"}</td>
                  <td className="px-4 py-3">{v.voucher_type ?? "-"}</td>
                  <td className="px-4 py-3 text-right">{v.discount_value ?? "-"}</td>
                  <td className="px-4 py-3">{v.expired_at ? new Date(v.expired_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      className={
                        "px-3 py-1 rounded-full text-xs font-bold border " +
                        (v.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200")
                      }
                      onClick={() =>
                        setVoucherActive(v.id, !v.is_active)
                          .then(() => refresh())
                          .catch((e) => setError((e as Error).message))
                      }
                    >
                      {v.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

