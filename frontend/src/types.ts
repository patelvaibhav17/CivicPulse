export type Category = 'POTHOLE' | 'WATER_LEAK' | 'STREETLIGHT' | 'WASTE' | 'SEWAGE' | 'ROAD_DAMAGE' | 'ENCROACHMENT' | 'OTHER';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type UserRole = 'Citizen' | 'Validator' | 'Officer' | 'Admin';

export interface Location {
  coordinates: [number, number]; // [latitude, longitude]
  address: string;
  ward: string;
}

export interface AIAnalysis {
  isValidIssue: boolean;
  isFakeOrManipulated: boolean;
  category: Category;
  subCategory: string;
  severity: Severity;
  severityReason: string;
  confidenceScore: number;
  estimatedDimensions: {
    description: string;
    affectedAreaSqMeters: number | null;
  };
  immediateRisk: boolean;
  riskDescription: string | null;
  suggestedDepartment: string;
  officerSummary: string;
  citizenSummary: string;
  tags: string[];
  locationContext: string;
  estimatedResolutionDays: number;
}

export interface Comment {
  id: string;
  author: string;
  authorRole: UserRole;
  text: string;
  timestamp: string;
  mediaUrl?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  status: Status;
  location: Location;
  mediaUrls: string[];
  aiAnalysis: AIAnalysis;
  reportedBy: string;
  reportedByName: string;
  assignedTo: string | null; // Officer UID
  assignedToName: string | null;
  department: string;
  verificationCount: number;
  verifiers: string[]; // User IDs who verified
  upvotes: number;
  upvoters: string[]; // User IDs who upvoted
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  tags: string[];
  comments: Comment[];
  progressUpdates: {
    status: Status;
    notes: string;
    mediaUrl?: string;
    timestamp: string;
    updatedBy: string;
  }[];
}

export interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  phone?: string;
  trustScore: number; // 0 - 100
  xp: number;
  streakCount: number;
  lastActiveDate?: string;
  badges: {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlockedAt: string;
  }[];
  ward: string;
  reportedCount: number;
  verifiedCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'status' | 'verification' | 'alert' | 'gamification';
  issueId?: string;
}

export interface AppSettings {
  geminiApiKey: string;
  googleMapsApiKey: string;
  simulatedAIMode: boolean;
  language: 'en' | 'hi' | 'gu'; // English, Hindi, Gujarati
}
