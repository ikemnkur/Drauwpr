export interface Drop {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  trailerUrl: string;
  thumbnailUrl: string;
  fileType: 'game' | 'app' | 'document' | 'music' | 'video' | 'other';
  fileSize: string;             // human-readable, e.g. "12.4 MB"
  fileSizeBytes: number | null; // raw bytes from DB
  filePath: string | null;      // S3 key or local path
  originalFileName: string | null;
  mimeType: string | null;
  scheduledDropTime: number;    // unix ms
  actualDropTime: number | null;// unix ms — filled when drop unlocks
  createdAt: number;            // unix ms
  expiresAt: number;            // unix ms
  goalAmount: number;           // credits (Spark Threshold)
  currentContributions: number; // credits
  contributorCount: number;
  momentum: number;
  burnRate: number;             // v = 1 + M
  lastMomentumUpdate: string | null;
  sensitivity: number;          // tunable constant
  decayConstant: number;        // k — momentum decay rate
  basePrice: number;            // credits for post-drop purchase
  dailyPriceDecayPct?: number;  // legacy field (deprecated)
  volumeDecayStep?: number;     // legacy field (deprecated)
  volumeDecayPct?: number;      // legacy field (deprecated)
  totalDownloads: number;
  totalRevenue: number;         // credits earned from post-drop sales
  avgRating: number | null;     // 0-100 community rating
  reviewCount: number;
  likeCount: number;
  dislikeCount: number;
  status: 'draft' | 'pending' | 'active' | 'dropped' | 'expired' | 'removed';
  isPublic: boolean;
  tags: string[];
  lastContributionTime?: number; // unix ms
}

export interface Contributor {
  id: string;
  username: string;
  avatar: string;
  amount: number;       // credits
  timestamp: number;    // unix ms
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  comment: string;
  liked: boolean | null; // true=like, false=dislike, null=no vote
  rating: number;        // 0-100
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  creditBalance: number;
  joined: number;
  verification: string; // 'none' | 'false' | 'true'
  // added fields
  accountStatus: string; // 'active' | 'suspended' | 'banned'
  accountType: string; // 'free' | 'standard' | 'premium' | 'admin'
}

export interface CreatorProfile {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  rating: number;            // 0-100
  followerCount: number;
  totalDrops: number;
  totalCreditsEarned: number;
  joined: number;
  bioVideoUrl?: string;      // YouTube embed URL
  bannerUrl?: string;        // Profile banner image URL
  socialLinks?: SocialLinks;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  github?: string;
  tiktok?: string;
  discord?: string;
  website?: string;
}
