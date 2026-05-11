/**
 * tryOnStore.ts
 * Singleton store chia sẻ trạng thái thử đồ ảo giữa các màn hình.
 * Dùng pattern observer đơn giản để notify listeners khi state thay đổi.
 */

export type TryOnState = "idle" | "loading" | "result" | "error";

interface TryOnStoreData {
  state: TryOnState;
  resultUrl: string;
  errorMsg: string;
  personImage: any;
  clothImage: string;
  productId: string;
  productName: string;
  selectedColor: string;
}

type Listener = (data: TryOnStoreData) => void;

const store: TryOnStoreData = {
  state: "idle",
  resultUrl: "",
  errorMsg: "",
  personImage: null,
  clothImage: "",
  productId: "",
  productName: "",
  selectedColor: "",
};

const listeners = new Set<Listener>();

export const tryOnStore = {
  get: (): TryOnStoreData => ({ ...store }),

  update: (patch: Partial<TryOnStoreData>) => {
    Object.assign(store, patch);
    listeners.forEach((fn) => fn({ ...store }));
  },

  subscribe: (fn: Listener): (() => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
