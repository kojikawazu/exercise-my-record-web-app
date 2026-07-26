/**
 * マスターの種別。API のクエリ `type` と管理画面のタブがこの値を共有する。
 * 表示順もこの配列の順序に従う。
 *
 * 値と型はペアで変わるため同じファイルに同居させる（`.claude/rules/typescript.md`
 * 「型の元になる定数は『型と同じファイル』に置く」）。表示ラベル（部位 / 種目 /
 * 有酸素種別）は UI の関心事なので、ここではなく画面側に置く。
 */
export const MASTER_TYPES = ['body-parts', 'exercises', 'cardio-types'] as const;

/**
 * マスターの種別。`ExerciseMaster.type` に格納され、API のクエリ `type` として渡される。
 */
export type MasterType = (typeof MASTER_TYPES)[number];

/**
 * マスター 1 件の API 契約。`/api/masters` 系が返す形で、Route Handler と画面が共有する。
 *
 * `ExerciseMaster` の全カラムではなく**画面が必要とする項目だけ**を持つ。監査カラム
 * （`createdAt` / `updatedAt`）は公開しない（`.claude/rules/api.md`「レスポンス整形」）。
 */
export type MasterResponse = {
  /** 項目の一意 ID。編集・削除の対象指定に使う */
  id: string;
  /** 項目の名称。一覧表示と編集の対象。前後の空白は保存時に除去済み */
  name: string;
  /** 所属するマスター種別 */
  type: MasterType;
};

/**
 * `MasterResponse` を返すための Prisma `select`。
 *
 * `MasterResponse` と**必ず対で変わる**ため同じファイルに置く。列を足すときは
 * 両方を更新する（型だけ足すと `satisfies` で、select だけ足すと未使用で気づける）。
 */
export const MASTER_SELECT = { id: true, name: true, type: true } as const;

/**
 * 値が有効なマスター種別かを判定する。API のクエリ検証に使う。
 *
 * @param value - 判定対象。未指定のクエリを想定して `null` を許容する
 * @returns 有効なマスター種別なら `true`
 */
export function isMasterType(value: string | null): value is MasterType {
  return value !== null && (MASTER_TYPES as readonly string[]).includes(value);
}
