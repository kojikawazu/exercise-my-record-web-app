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
};
