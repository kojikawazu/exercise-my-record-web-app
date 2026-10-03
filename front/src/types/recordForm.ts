/**
 * 記録フォーム（追加・編集で共用）の筋トレ 1 行分の入力値。
 * 数値項目も入力途中（空文字・小数点のみ等）を扱うため文字列で保持し、保存時に数値へ変換する。
 */
export type WorkoutRow = {
  /** 行を一意に識別するキー（描画の key・更新/削除の対象特定・エラーの紐付けに使う）。 */
  id: string;
  /** 部位（未選択は空文字）。 */
  part: string;
  /** 種目名。 */
  name: string;
  /** セット数（文字列。保存時に数値へ変換）。 */
  sets: string;
  /** 1 セットあたりの回数（文字列。保存時に数値へ変換）。 */
  reps: string;
  /** 重量 kg（文字列。保存時に数値へ変換）。0 を許容する。 */
  weight: string;
};

/**
 * 記録フォーム（追加・編集で共用）の有酸素 1 行分の入力値。
 * 数値項目は入力途中を扱うため文字列で保持し、保存時に数値へ変換する。
 */
export type CardioRow = {
  /** 行を一意に識別するキー（描画の key・更新/削除の対象特定・エラーの紐付けに使う）。 */
  id: string;
  /** 有酸素種別（マスター cardio-types の名称。未選択は空文字）。マスターで増減するため固定 union にしない。 */
  type: string;
  /** 時間（分。文字列で保持し保存時に数値へ変換）。距離とともに空なら未入力の任意行。 */
  minutes: string;
  /** 距離（km。文字列で保持し保存時に数値へ変換）。時間とともに空なら未入力の任意行。 */
  distance: string;
};

/** 記録フォームの保存対象（日付を除く入力値一式）。追加・編集で共用する。 */
export type RecordFormValues = {
  /** 体調メモ（未入力は空文字。前後の空白は保存時に除去する）。 */
  memo: string;
  /** 筋トレ行（最少 1 行）。 */
  workouts: WorkoutRow[];
  /** 有酸素行。時間・距離がともに空の行は未入力として保存しない。 */
  cardios: CardioRow[];
};

/** 1 行内のフィールド名 → エラーメッセージの対応。エラーのないフィールドはキーを持たない。 */
export type FieldErrors = Record<string, string>;

/** 記録フォーム全体のバリデーション結果。行エラーは行 id をキーに保持する。 */
export type ValidationErrors = {
  /** 日付のエラー。エラーがなければ省略される。 */
  date?: string;
  /** 筋トレ行のエラー（行 id → フィールド別エラー）。エラーのない行はキーを持たない。 */
  workouts: Record<string, FieldErrors>;
  /** 有酸素行のエラー（行 id → フィールド別エラー）。エラーのない行・未入力の任意行はキーを持たない。 */
  cardios: Record<string, FieldErrors>;
};
