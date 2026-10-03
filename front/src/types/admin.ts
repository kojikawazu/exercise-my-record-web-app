/**
 * admin API（`/api/admin/me`）の契約型。Route Handler とフロント（repositories / hooks）で共有する。
 */

/**
 * `GET /api/admin/me` のレスポンス。
 * 200 は `{ isAdmin: true }`、401（トークン欠落・無効）/ 403（管理者以外）は `{ isAdmin: false }` を返す。
 */
export type AdminMeResponse = {
  /** リクエストのユーザーが管理者（`ADMIN_EMAIL` と一致）か。 */
  isAdmin: boolean;
};
