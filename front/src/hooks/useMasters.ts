import { useEffect, useState } from 'react';
import { fetchMasters } from '@/repositories/master';
import type { ApiResult } from '@/types/apiResult';
import type { MasterResponse } from '@/types/master';

/** 記録フォームの選択肢の取得状態。 */
export type MastersStatus =
  /** 3 種別のいずれかの結果がまだ届いていない。 */
  | 'loading'
  /** 3 種別とも取得に成功した。 */
  | 'ready'
  /** 1 種別以上の取得に失敗した（成功した種別の選択肢は使える）。 */
  | 'error';

/** 記録フォームで使うマスターの選択肢（名称のみ）と取得状態。 */
export type UseMasters = {
  /** 部位の名称（名称昇順）。取得前・取得失敗時は空配列。 */
  bodyParts: string[];
  /** 種目の名称（名称昇順）。入力候補として使い、自由入力も許す。取得前・取得失敗時は空配列。 */
  exercises: string[];
  /** 有酸素種別の名称（名称昇順）。取得前・取得失敗時は空配列。 */
  cardioTypes: string[];
  /** 取得状態。 */
  status: MastersStatus;
};

/** 3 種別の取得結果（部位・種目・有酸素種別の順）。 */
type MasterResults = [
  ApiResult<MasterResponse[]>,
  ApiResult<MasterResponse[]>,
  ApiResult<MasterResponse[]>,
];

/**
 * 取得結果を名称の配列へ変換する。失敗した結果は空配列にする。
 *
 * @param result - 1 種別分の取得結果
 * @returns 名称の配列
 */
const namesOf = (result: ApiResult<MasterResponse[]>) =>
  result.ok ? result.data.map((m) => m.name) : [];

/**
 * 記録フォーム（追加・編集）の選択肢となる部位・種目・有酸素種別のマスターを取得するフック。
 * マウント時に 3 種別を並列で 1 回だけ取得する。
 *
 * @returns 選択肢と取得状態（各メンバーの意味は {@link UseMasters} を参照）
 */
export function useMasters(): UseMasters {
  const [results, setResults] = useState<MasterResults | null>(null);

  useEffect(() => {
    let ignore = false;
    void Promise.all([
      fetchMasters('body-parts'),
      fetchMasters('exercises'),
      fetchMasters('cardio-types'),
    ]).then((fetched) => {
      if (!ignore) setResults(fetched);
    });
    return () => {
      ignore = true;
    };
  }, []);

  if (!results) return { bodyParts: [], exercises: [], cardioTypes: [], status: 'loading' };
  const [bodyParts, exercises, cardioTypes] = results;
  return {
    bodyParts: namesOf(bodyParts),
    exercises: namesOf(exercises),
    cardioTypes: namesOf(cardioTypes),
    status: results.every((r) => r.ok) ? 'ready' : 'error',
  };
}
