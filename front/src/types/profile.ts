/**
 * profile API（`/api/profile`）の契約型。Route Handler とフロント（repositories / hooks）で共有する。
 */

/** `GET /api/profile` / `POST /api/profile` のレスポンス。 */
export type ProfileResponse = {
  /** 保存済みの体重（kg）。未保存（かつサーバーに暫定値も無い）場合は `null`。 */
  weightKg: number | null;
};

/** `POST /api/profile` のリクエスト本文。 */
export type ProfileSaveRequest = {
  /** 保存する体重（kg）。数値でなければ 400。 */
  weightKg: number;
  /** 体重の履歴に積む日付（`YYYY-MM-DD`、ブラウザのローカル日付）。同日の履歴は上書きする。不正なら 400。 */
  date: string;
};

/** 体重の履歴の 1 日分。 */
export type WeightHistoryPoint = {
  /** 記録日（`YYYY-MM-DD`）。 */
  date: string;
  /** その日に保存した体重（kg）。同日に複数回保存した場合は最後の値。 */
  weightKg: number;
};

/** `GET /api/profile/weights` のレスポンス。 */
export type WeightHistoryResponse = {
  /** 期間内の体重の履歴（日付昇順）。履歴が無ければ空配列。 */
  points: WeightHistoryPoint[];
};
