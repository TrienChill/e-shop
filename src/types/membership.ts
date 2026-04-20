// ─── Types cho Membership Levels ───────────────────────────────────────────────

export interface MembershipLevel {
  id: string;
  level_name: string;
  min_spending: number;
  benefit_percentage: number;
  icon_url?: string | null;
  description?: string | null;
  created_at: string;
  min_orders?: number;
  color?: string; // Màu đại diện cho hạng
}

export interface MembershipLevelWithStats extends MembershipLevel {
  member_count: number;
}

// Các cấp hạng mặc định
export const MEMBERSHIP_TIERS: Omit<MembershipLevel, "id" | "created_at" | "description" | "icon_url">[] = [
  {
    level_name: "Đồng",
    min_spending: 0,
    benefit_percentage: 0,
    color: "#CD7F32", // Bronze color
    min_orders: 0,
  },
  {
    level_name: "Bạc",
    min_spending: 5000000,
    benefit_percentage: 2,
    color: "#C0C0C0", // Silver color
    min_orders: 0,
  },
  {
    level_name: "Vàng",
    min_spending: 20000000,
    benefit_percentage: 5,
    color: "#FFD700", // Gold color
    min_orders: 0,
  },
  {
    level_name: "Kim Cương",
    min_spending: 50000000,
    benefit_percentage: 10,
    color: "#B9F2FF", // Diamond color
    min_orders: 0,
  },
];

// Map cấp hạng với màu sắc cho UI
export const TIER_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  "Đồng": {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-800",
    icon: "🥉",
  },
  "Bạc": {
    bg: "bg-gray-100",
    border: "border-gray-300",
    text: "text-gray-700",
    icon: "🥈",
  },
  "Vàng": {
    bg: "bg-yellow-100",
    border: "border-yellow-400",
    text: "text-yellow-700",
    icon: "🥇",
  },
  "Kim Cương": {
    bg: "bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-800",
    icon: "💎",
  },
};

// Format tiền VND
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format phần trăm
export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

// Tính toán hạng tiếp theo cho user
export const calculateNextTier = (
  currentLevel: MembershipLevel | null,
  allLevels: MembershipLevel[]
): MembershipLevel | null => {
  if (!currentLevel) {
    // Nếu chưa có hạng, trả về hạng thấp nhất có min_spending > 0
    return allLevels
      .filter(l => l.min_spending > 0)
      .sort((a, b) => a.min_spending - b.min_spending)[0] || null;
  }

  // Tìm hạng cao hơn gần nhất
  const sortedLevels = allLevels.sort((a, b) => a.min_spending - b.min_spending);
  return sortedLevels.find(l => l.min_spending > currentLevel.min_spending) || null;
};

// Tính tiến độ lên hạng tiếp theo
export const calculateProgress = (
  totalSpending: number,
  currentLevel: MembershipLevel | null,
  nextLevel: MembershipLevel | null
): { progress: number; remaining: number } => {
  if (!nextLevel) {
    return { progress: 100, remaining: 0 }; // Đã ở hạng cao nhất
  }

  const currentMin = currentLevel?.min_spending || 0;
  const targetMin = nextLevel.min_spending;
  const progress = Math.min(100, ((totalSpending - currentMin) / (targetMin - currentMin)) * 100);
  const remaining = Math.max(0, targetMin - totalSpending);

  return { progress, remaining };
};
