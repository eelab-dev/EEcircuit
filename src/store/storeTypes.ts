export type StoreUpdate<TStore> =
  | Partial<TStore>
  | ((state: TStore) => Partial<TStore> | TStore);

export type StoreSetter<TStore> = (update: StoreUpdate<TStore>) => void;
export type StoreGetter<TStore> = () => TStore;

export type SliceCreator<TStore, TSlice> = (
  set: StoreSetter<TStore>,
  get: StoreGetter<TStore>,
) => TSlice;
