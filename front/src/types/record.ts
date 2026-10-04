/**
 * records API（`/api/records` / `/api/records/[date]`）の契約型。
 * Route Handler とフロント（repositories / hooks / components）で共有し、レスポンスの形を 1 箇所で定義する。
 */

/** 有酸素 1 件分（一覧・詳細のレスポンス、作成・更新のリクエストで共通）。 */
type RecordCardio = {
  /** 有酸素種別（例: ラン / ウォーク）。マスター連動を見据えて文字列で持つ。 */
  type: string;
  /** 運動時間（分）。 */
  minutes: number;
  /** 距離（km）。 */
  distance: number;
};

/** 記録一覧の 1 日分。派生値（合計）はサーバーで算定して返す。 */
export type RecordListItem = {
  /** 記録日（`YYYY-MM-DD`）。一覧の一意キー兼、詳細・編集への遷移パラメータ。 */
  date: string;
  /** その日の筋トレセット数の合計。 */
  totalSets: number;
  /** その日の有酸素の合計時間（分）。 */
  cardioMinutes: number;
  /** その日の有酸素の合計距離（km）。 */
  cardioDistance: number;
  /** その日の有酸素の一覧（推定カロリー表示に使う）。記録が無い日は空配列。 */
  cardios: RecordCardio[];
};

/** `GET /api/records` のレスポンス。 */
export type RecordListResponse = {
  /** 当該ページの記録（日付降順）。 */
  records: RecordListItem[];
  /** 全記録件数。 */
  totalCount: number;
  /** 実際に返したページ（1 始まり）。範囲外の要求はサーバーが丸めるため、要求ページと異なることがある。 */
  page: number;
  /** 総ページ数。記録が 0 件でも 1。 */
  totalPages: number;
};

/** 記録詳細の筋トレ 1 種目分。 */
export type RecordWorkout = {
  /** 種目の一意 ID（リストの key に使う）。 */
  id: string;
  /** 部位。 */
  part: string;
  /** 種目名。 */
  name: string;
  /** セット数。 */
  sets: number;
  /** 1 セットあたりの回数。 */
  reps: number;
  /** 重量（kg）。 */
  weight: number;
};

/** `GET /api/records/[date]` のレスポンス。 */
export type RecordDetail = {
  /** 記録日（`YYYY-MM-DD`）。 */
  date: string;
  /** 体調メモ。未入力は `null`。 */
  memo: string | null;
  /** 筋トレ種目の一覧。 */
  workouts: RecordWorkout[];
  /** 有酸素の一覧。 */
  cardios: RecordCardio[];
};

/** 作成・更新リクエストの筋トレ 1 種目分（ID はサーバーが採番するため持たない）。 */
type RecordWorkoutInput = Omit<RecordWorkout, 'id'>;

/** `PATCH /api/records/[date]` のリクエスト本文（筋トレ・有酸素は全置換）。 */
export type RecordUpdateRequest = {
  /** 体調メモ。未入力は `null`。 */
  memo: string | null;
  /** 筋トレ種目の一覧。 */
  workouts: RecordWorkoutInput[];
  /** 有酸素の一覧。入力が無い場合は `null`。 */
  cardios: RecordCardio[] | null;
};

/** `POST /api/records` のリクエスト本文。 */
export type RecordCreateRequest = RecordUpdateRequest & {
  /** 記録日（`YYYY-MM-DD`）。同日の記録が既にあれば 409。 */
  date: string;
};

/** `POST /api/records` / `PATCH /api/records/[date]` の成功レスポンス。 */
export type RecordIdResponse = {
  /** 作成・更新した記録の ID。 */
  id: string;
};
