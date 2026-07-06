import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// モック: prisma と adminAuth（外部 I/O のみ。CSV/JSON 生成ロジックは実物を検証）
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

type ExportRecord = {
  date: Date;
  memo: string | null;
  workouts: { part: string; name: string; sets: number; reps: number; weight: number }[];
  cardios: { type: string; minutes: number; distance: number }[];
};

const makePrisma = (findManyResult: ExportRecord[] = []) => ({
  exerciseRecord: {
    findMany: vi.fn().mockResolvedValue(findManyResult),
  },
});

const url = (query: string) => `http://localhost/api/admin/export${query}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ authorized: true } as never);
});

// ---------------------------------------------------------------------------
// GET /api/admin/export
// ---------------------------------------------------------------------------
describe('GET /api/admin/export', () => {
  // -------------------------------------------------------------------------
  // 正常系
  // -------------------------------------------------------------------------
  it('should return CSV with header and horizontally-expanded rows when format is omitted', async () => {
    const prisma = makePrisma([
      {
        date: new Date('2026-01-02T00:00:00.000Z'),
        memo: 'good',
        workouts: [
          { part: '胸', name: 'ベンチ', sets: 3, reps: 10, weight: 60 },
          { part: '背中', name: 'デッド', sets: 4, reps: 8, weight: 100 },
        ],
        cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
      },
    ]);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31')));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="records_2026-01-01_2026-01-31.csv"',
    );

    const text = await res.text();
    const lines = text.split('\n');
    // ヘッダ + workouts が 2 件（多い方）→ 全 3 行
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'date,memo,workout_part,workout_name,workout_sets,workout_reps,workout_weight,cardio_type,cardio_minutes,cardio_distance',
    );
    // 1 行目: workout[0] + cardio[0]
    expect(lines[1]).toBe('2026-01-02,good,胸,ベンチ,3,10,60,ラン,30,5');
    // 2 行目: workout[1] のみ（cardio は欠落 → 空文字）
    expect(lines[2]).toBe('2026-01-02,good,背中,デッド,4,8,100,,,');
  });

  it('should escape commas, quotes and newlines in fields (escapeCsv)', async () => {
    const prisma = makePrisma([
      {
        date: new Date('2026-02-10T00:00:00.000Z'),
        memo: 'a,b"c\nd',
        workouts: [],
        cardios: [],
      },
    ]);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-02-01&to=2026-02-28')));
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.split('\n');
    // memo にカンマ・ダブルクオート・改行 → 全体クオート、" は "" にエスケープ
    // クオート内の改行によりデータ行は 2 物理行に分割される（ヘッダ + 2 = 3）
    expect(lines).toHaveLength(3);
    expect(text).toContain('2026-02-10,"a,b""c\nd",,,,,,,,');
  });

  it('should output one row per record even when workouts and cardios are empty (maxLen=1)', async () => {
    const prisma = makePrisma([
      {
        date: new Date('2026-03-05T00:00:00.000Z'),
        memo: null,
        workouts: [],
        cardios: [],
      },
    ]);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-03-01&to=2026-03-31')));
    expect(res.status).toBe(200);
    const lines = (await res.text()).split('\n');
    // ヘッダ + 1 行
    expect(lines).toHaveLength(2);
    // memo が null → 空文字、workout/cardio 全欠落 → 空文字
    expect(lines[1]).toBe('2026-03-05,,,,,,,,,');
  });

  it('should return records as a JSON array when format=json', async () => {
    const records: ExportRecord[] = [
      {
        date: new Date('2026-04-01T00:00:00.000Z'),
        memo: 'json memo',
        workouts: [{ part: '脚', name: 'スクワット', sets: 5, reps: 5, weight: 80 }],
        cardios: [],
      },
    ];
    const prisma = makePrisma(records);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-04-01&to=2026-04-30&format=json')));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].memo).toBe('json memo');
    expect(body[0].workouts).toHaveLength(1);
    expect(body[0].workouts[0].name).toBe('スクワット');
  });

  // -------------------------------------------------------------------------
  // 準正常系
  // -------------------------------------------------------------------------
  it('should return 400 when from is missing', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?to=2026-01-31')));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('from/to required');
  });

  it('should return 400 when to is missing', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-01-01')));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('from/to required');
  });

  it('should return 400 when format is neither csv nor json', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31&format=xml')));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid format');
  });

  it('should return 400 when format is an empty string (?? only guards null)', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    // `?format=` は空文字を渡す。`?? 'csv'` は null/undefined のみを補完するため
    // 空文字はそのまま許可リスト外となり 400 になる。
    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31&format=')));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid format');
  });

  // -------------------------------------------------------------------------
  // 異常系
  // -------------------------------------------------------------------------
  it('should return 401 when not authorized (requireAdmin evaluated first)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    // 認可が先に評価されるため getPrisma は呼ばれない
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31')));
    expect(res.status).toBe(401);
    expect(prisma.exerciseRecord.findMany).not.toHaveBeenCalled();
  });

  it('should return 403 when authenticated user is not an admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31')));
    expect(res.status).toBe(403);
    expect(prisma.exerciseRecord.findMany).not.toHaveBeenCalled();
  });

  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);

    const res = await GET(new Request(url('?from=2026-01-01&to=2026-01-31')));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });
});
