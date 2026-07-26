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
 * 値が有効なマスター種別かを判定する。API のクエリ検証に使う。
 *
 * @param value - 判定対象。未指定のクエリを想定して `null` を許容する
 * @returns 有効なマスター種別なら `true`
 */
export function isMasterType(value: string | null): value is MasterType {
  return value !== null && (MASTER_TYPES as readonly string[]).includes(value);
}
