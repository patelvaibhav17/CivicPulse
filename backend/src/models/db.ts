import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mongoose, { Schema as MSchema } from 'mongoose';
import { UserProfile, Issue, Notification } from '../types/index';

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');

interface Schema {
  users: UserProfile[];
  issues: Issue[];
  notifications: Notification[];
}

let firestore: any = null;
let isMongo = false;

// 1. Mongoose Schemas definitions
const UserSchema = new MSchema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  trustScore: { type: Number, default: 50 },
  xp: { type: Number, default: 0 },
  streakCount: { type: Number, default: 0 },
  ward: { type: String, required: true },
  reportedCount: { type: Number, default: 0 },
  verifiedCount: { type: Number, default: 0 },
  badges: [{
    id: String,
    name: String,
    icon: String,
    description: String,
    unlockedAt: String
  }]
});

const IssueSchema = new MSchema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  severity: { type: String, required: true },
  status: { type: String, required: true },
  location: {
    coordinates: [Number],
    address: String,
    ward: String
  },
  mediaUrls: [String],
  aiAnalysis: {
    isValidIssue: Boolean,
    isFakeOrManipulated: Boolean,
    category: String,
    subCategory: String,
    severity: String,
    severityReason: String,
    confidenceScore: Number,
    estimatedDimensions: {
      description: String,
      affectedAreaSqMeters: Number
    },
    immediateRisk: Boolean,
    riskDescription: String,
    suggestedDepartment: String,
    officerSummary: String,
    citizenSummary: String,
    tags: [String],
    locationContext: String,
    estimatedResolutionDays: Number
  },
  reportedBy: String,
  reportedByName: String,
  assignedTo: String,
  assignedToName: String,
  department: String,
  verificationCount: Number,
  verifiers: [String],
  upvotes: Number,
  upvoters: [String],
  createdAt: String,
  updatedAt: String,
  resolvedAt: String,
  tags: [String],
  comments: [{
    id: String,
    author: String,
    authorRole: String,
    text: String,
    timestamp: String
  }],
  progressUpdates: [{
    status: String,
    notes: String,
    timestamp: String,
    updatedBy: String
  }]
});

const NotificationSchema = new MSchema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, required: true },
  issueId: String
});

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const IssueModel = mongoose.models.Issue || mongoose.model('Issue', IssueSchema);
const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// 2. Initialize Firestore if PROJECT_ID is set
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    if (!getApps().length) {
      if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          })
        });
      } else {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
    }
    firestore = getFirestore();
    console.log("Connected to Google Cloud Firestore database successfully.");
  } catch (e) {
    console.error("Firestore initialization error:", e);
  }
}

class DatabaseManager {
  private schema: Schema = { users: [], issues: [], notifications: [] };
  private initialized = false;

  async init() {
    if (this.initialized) return;

    // 1. Try MongoDB
    if (process.env.MONGODB_URI) {
      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI);
          isMongo = true;
          console.log("Connected to MongoDB cloud database successfully.");
        } else {
          isMongo = true;
        }

        const userCount = await UserModel.countDocuments();
        if (userCount === 0) {
          console.log("MongoDB collection is empty. Seeding standard data...");
          await this.seedMongo();
        }
        this.initialized = true;
        return;
      } catch (e) {
        console.error("Failed to connect/initialize MongoDB. Checking Firestore...", e);
        isMongo = false;
      }
    }

    // 2. Try Firestore
    if (firestore) {
      try {
        const usersSnap = await firestore.collection('users').limit(1).get();
        if (usersSnap.empty) {
          console.log("Firestore database is empty. Seeding standard data...");
          await this.seedFirestore();
        }
        this.initialized = true;
        return;
      } catch (e) {
        console.error("Failed to check/seed Firestore. Falling back to local file db...", e);
        firestore = null;
      }
    }

    // 3. Fallback to Local file
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = await fs.promises.readFile(DB_FILE, 'utf-8');
        this.schema = JSON.parse(raw);
        this.initialized = true;
        return;
      } catch (e) {
        console.error("Database load error, seeding fresh database...", e);
      }
    }

    await this.seed();
    this.initialized = true;
  }

  private async save() {
    if (isMongo || firestore) return;
    await fs.promises.writeFile(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
  }

  private getSeedData() {
    const defaultPasswordHash = bcrypt.hashSync('password', 10);

    const users: UserProfile[] = [
      {
        uid: 'user_aarav',
        name: 'Aarav Patel',
        role: 'Citizen',
        email: 'aarav.patel@civicpulse.org',
        password: defaultPasswordHash,
        phone: '+91 98765 43210',
        trustScore: 88,
        xp: 120,
        streakCount: 3,
        ward: 'Ward 1 (Vallabh Vidyanagar)',
        reportedCount: 2,
        verifiedCount: 5,
        badges: [
          {
            id: 'b1',
            name: 'First Report',
            icon: '🌱',
            description: 'Submitted your first civic report',
            unlockedAt: new Date(Date.now() - 720 * 3600 * 1000).toISOString()
          },
          {
            id: 'b2',
            name: 'Pothole Spotter',
            icon: '🕳️',
            description: 'Reported 2+ potholes successfully',
            unlockedAt: new Date(Date.now() - 240 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        uid: 'user_priya',
        name: 'Priya Sharma',
        role: 'Validator',
        email: 'priya.sharma@civicpulse.org',
        password: defaultPasswordHash,
        phone: '+91 98123 45678',
        trustScore: 97,
        xp: 450,
        streakCount: 8,
        ward: 'Ward 2 (Amul Dairy Road)',
        reportedCount: 5,
        verifiedCount: 24,
        badges: [
          {
            id: 'b1',
            name: 'First Report',
            icon: '🌱',
            description: 'Submitted your first civic report',
            unlockedAt: new Date(Date.now() - 1440 * 3600 * 1000).toISOString()
          },
          {
            id: 'b3',
            name: 'Community Guardian',
            icon: '🛡️',
            description: 'Verified over 10 reported issues',
            unlockedAt: new Date(Date.now() - 360 * 3600 * 1000).toISOString()
          },
          {
            id: 'b4',
            name: 'Green Warrior',
            icon: '🌳',
            description: 'Reported 3+ waste management issues',
            unlockedAt: new Date(Date.now() - 120 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        uid: 'user_sharma',
        name: 'Officer Rakesh Sharma',
        role: 'Officer',
        email: 'r.sharma@anandgov.in',
        password: defaultPasswordHash,
        phone: '+91 90000 11111',
        trustScore: 100,
        xp: 0,
        streakCount: 0,
        ward: 'Ward 1 (Vallabh Vidyanagar)',
        reportedCount: 0,
        verifiedCount: 0,
        badges: []
      },
      {
        uid: 'user_patil',
        name: 'Officer Anita Patil',
        role: 'Officer',
        email: 'a.patil@anandgov.in',
        password: defaultPasswordHash,
        phone: '+91 90000 22222',
        trustScore: 100,
        xp: 0,
        streakCount: 0,
        ward: 'Ward 2 (Amul Dairy Road)',
        reportedCount: 0,
        verifiedCount: 0,
        badges: []
      },
      {
        uid: 'user_admin',
        name: 'Central Admin',
        role: 'Admin',
        email: 'admin@civicpulse.org',
        password: defaultPasswordHash,
        phone: '+91 91111 22222',
        trustScore: 100,
        xp: 0,
        streakCount: 0,
        ward: 'Municipal Headquarters',
        reportedCount: 0,
        verifiedCount: 0,
        badges: []
      }
    ];

    const issues: Issue[] = [
      {
        id: 'iss_1',
        title: 'Severe road crater near Vidyanagar Gate',
        description: 'A large, deep pothole has opened up right near the bend on Bhai Kaka Marg. It is extremely hazardous for two-wheelers, especially after dark. Multiple vehicles have suffered tire damage.',
        category: 'POTHOLE',
        severity: 'HIGH',
        status: 'SUBMITTED',
        location: {
          coordinates: [22.5532, 72.9238],
          address: 'Bhai Kaka Marg, Vallabh Vidyanagar, Anand, Gujarat 388120',
          ward: 'Ward 1 (Vallabh Vidyanagar)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'POTHOLE',
          subCategory: 'Deep Pothole',
          severity: 'HIGH',
          severityReason: 'Large structural crater in a high-speed arterial road affecting dense traffic.',
          confidenceScore: 0.94,
          estimatedDimensions: {
            description: 'Approx 80cm width, 15cm depth',
            affectedAreaSqMeters: 0.6
          },
          immediateRisk: true,
          riskDescription: 'High risk of two-wheeler accidents and severe suspension damage.',
          suggestedDepartment: 'Roads & Infrastructure',
          officerSummary: 'Deep crater on Vidyanagar Gate main avenue. Substantial depth posing immediate vehicle safety risks. Requires urgent patching.',
          citizenSummary: 'A critical pothole on Bhai Kaka Marg has been logged and sent for review.',
          tags: ['Pothole', 'Vidyanagar Road', 'Traffic Hazard', 'Road Damage'],
          locationContext: 'Outer lane near Vidyanagar Gate commercial blocks',
          estimatedResolutionDays: 3
        },
        reportedBy: 'user_aarav',
        reportedByName: 'Aarav Patel',
        assignedTo: null,
        assignedToName: null,
        department: 'Roads & Infrastructure',
        verificationCount: 1,
        verifiers: ['user_priya'],
        upvotes: 8,
        upvoters: ['user_priya'],
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Pothole', 'Vidyanagar Road', 'Traffic Hazard'],
        comments: [
          {
            id: 'c_1',
            author: 'Priya Sharma',
            authorRole: 'Validator',
            text: 'I passed by this yesterday. It is indeed very deep and hard to see at night because the streetlights in this segment are dim.',
            timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: []
      },
      {
        id: 'iss_2',
        title: 'Drinking water pipeline leak on Amul Dairy Road',
        description: 'Clean drinking water is gushing out from a fractured pipeline joint on Amul Dairy Road. Thousands of liters are being wasted and water pressure in nearby societies has dropped.',
        category: 'WATER_LEAK',
        severity: 'CRITICAL',
        status: 'VERIFIED',
        location: {
          coordinates: [22.5604, 72.9463],
          address: 'Amul Dairy Road, near Anand Railway Station, Anand, Gujarat 388001',
          ward: 'Ward 2 (Amul Dairy Road)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1607400201515-c2c41c07d307?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'WATER_LEAK',
          subCategory: 'Main Supply Burst',
          severity: 'CRITICAL',
          severityReason: 'High pressure leak of treated drinking water causing structural erosion and area supply drops.',
          confidenceScore: 0.98,
          estimatedDimensions: {
            description: 'High pressure fountain, wasting ~100L/min',
            affectedAreaSqMeters: 5
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Water & Sanitation',
          officerSummary: 'Pipeline rupture at pipeline coupling. Massive outflow. Threatens local road sub-base stability. Urgent valve closure and repair needed.',
          citizenSummary: 'Major water main leakage on Amul Dairy Road has been verified by the community and routed for emergency repairs.',
          tags: ['Water Waste', 'Pipe Burst', 'Flooding', 'Amul Dairy Road'],
          locationContext: 'Heavy traffic intersection sub-surface pipeline coupling near railway crossing',
          estimatedResolutionDays: 1
        },
        reportedBy: 'user_priya',
        reportedByName: 'Priya Sharma',
        assignedTo: null,
        assignedToName: null,
        department: 'Water & Sanitation',
        verificationCount: 3,
        verifiers: ['user_aarav', 'user_priya', 'user_validator_2'],
        upvotes: 18,
        upvoters: ['user_aarav'],
        createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Water Waste', 'Pipe Burst', 'Flooding'],
        comments: [
          {
            id: 'c_2',
            author: 'System',
            authorRole: 'Admin',
            text: 'Report promoted to VERIFIED status after receiving 3 validator confirmations.',
            timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: []
      },
      {
        id: 'iss_3',
        title: 'Overflowing dumpsters near Borsad Chowkdi Market',
        description: 'The municipal dumpsters are overflowing onto the footpath. Stray animals are dispersing trash everywhere. The stench is unbearable for shoppers and local vendors.',
        category: 'WASTE',
        severity: 'MEDIUM',
        status: 'ASSIGNED',
        location: {
          coordinates: [22.5412, 72.9275],
          address: 'Borsad Chowkdi, Anand-Borsad Road, Anand, Gujarat 388001',
          ward: 'Ward 5 (Borsad Chowkdi)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'WASTE',
          subCategory: 'Overflowing Bin',
          severity: 'MEDIUM',
          severityReason: 'Accumulated uncollected waste spilling into public walkway, creating sanitation hazards.',
          confidenceScore: 0.91,
          estimatedDimensions: {
            description: 'Approx 3 cubic meters of loose trash',
            affectedAreaSqMeters: 4
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Waste Management',
          officerSummary: 'Borsad Chowkdi secondary dump container exceeded capacity. Solid waste piling on sidewalk. Needs immediate clearance trip.',
          citizenSummary: 'Waste accumulation reported. Assessed by AI as Medium severity. Routed to Sanitation.',
          tags: ['Garbage Overflow', 'Sanitation', 'Public Nuisance', 'Borsad Chowkdi'],
          locationContext: 'Sanitation site next to commercial marketplace shops',
          estimatedResolutionDays: 2
        },
        reportedBy: 'user_aarav',
        reportedByName: 'Aarav Patel',
        assignedTo: 'user_sharma',
        assignedToName: 'Officer Rakesh Sharma',
        department: 'Waste Management',
        verificationCount: 4,
        verifiers: ['user_priya', 'user_validator_3', 'user_validator_4', 'user_validator_5'],
        upvotes: 24,
        upvoters: ['user_priya'],
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Garbage Overflow', 'Sanitation', 'Public Nuisance'],
        comments: [
          {
            id: 'c_3',
            author: 'Officer Rakesh Sharma',
            authorRole: 'Officer',
            text: 'Assigned to the Anand Sanitation team. Cleansing crew has been scheduled for morning route.',
            timestamp: new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: [
          {
            status: 'ASSIGNED',
            notes: 'Sanitation cleaning route assigned to Borsad Chowkdi truck team.',
            timestamp: new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString(),
            updatedBy: 'Officer Rakesh Sharma'
          }
        ]
      },
      {
        id: 'iss_4',
        title: 'Broken streetlight near Lambhvel Temple Park',
        description: 'Streetlight pole #SL-41 is completely dark. The area around the kids play area entrance is pitch black at night, making it unsafe for families.',
        category: 'STREETLIGHT',
        severity: 'LOW',
        status: 'RESOLVED',
        location: {
          coordinates: [22.5855, 72.9320],
          address: 'Lambhvel Road, near Lambhvel Temple, Anand, Gujarat 388310',
          ward: 'Ward 4 (Lambhvel Area)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1509024644558-2f56ce76c490?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'STREETLIGHT',
          subCategory: 'Dead Bulb',
          severity: 'LOW',
          severityReason: 'Isolated streetlight malfunction in a residential lane. No active wiring exposure.',
          confidenceScore: 0.89,
          estimatedDimensions: {
            description: 'Single lighting unit out',
            affectedAreaSqMeters: null
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Electricity',
          officerSummary: 'Pole SL-41 bulb burnt out. Standard replacement. Non-emergency.',
          citizenSummary: 'Streetlight bulb issue logged. Replaced by municipal team.',
          tags: ['Dark Pole', 'Park Safety', 'Lighting'],
          locationContext: 'Suburban walking path next to Lambhvel temple garden entrance',
          estimatedResolutionDays: 5
        },
        reportedBy: 'user_priya',
        reportedByName: 'Priya Sharma',
        assignedTo: 'user_patil',
        assignedToName: 'Officer Anita Patil',
        department: 'Electricity',
        verificationCount: 3,
        verifiers: ['user_aarav', 'user_priya', 'user_validator_9'],
        upvotes: 6,
        upvoters: [],
        createdAt: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        tags: ['Dark Pole', 'Park Safety', 'Lighting'],
        comments: [
          {
            id: 'c_4',
            author: 'Officer Anita Patil',
            authorRole: 'Officer',
            text: 'The electrical crew replaced the LED assembly and checked the fuse box on Pole SL-41. It is now fully operational.',
            timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: [
          {
            status: 'RESOLVED',
            notes: 'LED replacement complete. Light verified active.',
            timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
            updatedBy: 'Officer Anita Patil'
          }
        ]
      },
      {
        id: 'iss_5',
        title: 'Flooded underpass near Ganesh Crossing',
        description: 'Heavy water logging has accumulated in the Ganesh Crossing railway underpass due to a clogged storm drain. Cars are getting stuck and water depth has reached 2 feet.',
        category: 'WATER_LEAK',
        severity: 'CRITICAL',
        status: 'SUBMITTED',
        location: {
          coordinates: [22.5485, 72.9392],
          address: 'Ganesh Crossing Underpass, Anand, Gujarat 388001',
          ward: 'Ward 6 (Ganesh Crossing)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1547036967-23d11aacaee0?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'WATER_LEAK',
          subCategory: 'Storm Drain Blockage',
          severity: 'CRITICAL',
          severityReason: 'Underpass flooding halting regional traffic flow and creating immediate electrical/drowning hazards.',
          confidenceScore: 0.95,
          estimatedDimensions: {
            description: 'Water depth ~60cm, affected area ~40m',
            affectedAreaSqMeters: 120
          },
          immediateRisk: true,
          riskDescription: 'Severe risk of vehicle engine damage and passenger entrapment.',
          suggestedDepartment: 'Water & Sanitation',
          officerSummary: 'Ganesh Crossing underpass flooding. Drainage gates completely blocked by plastic waste. Needs immediate pump out and cleanup.',
          citizenSummary: 'Flooded railway underpass near Ganesh crossing has been logged. Sanitation team notified.',
          tags: ['Flooding', 'Underpass', 'Drainage Block', 'Traffic Jam'],
          locationContext: 'Railway underpass box tunnel on primary transit route',
          estimatedResolutionDays: 1
        },
        reportedBy: 'user_priya',
        reportedByName: 'Priya Sharma',
        assignedTo: null,
        assignedToName: null,
        department: 'Water & Sanitation',
        verificationCount: 0,
        verifiers: [],
        upvotes: 12,
        upvoters: ['user_aarav'],
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Flooding', 'Underpass', 'Drainage Block'],
        comments: [],
        progressUpdates: []
      },
      {
        id: 'iss_6',
        title: 'Broken asphalt and deep potholes on Karamsad Road',
        description: 'A 50-meter stretch of Karamsad Road has completely disintegrated. There are multiple deep potholes that make it impossible to drive in a straight line.',
        category: 'POTHOLE',
        severity: 'HIGH',
        status: 'VERIFIED',
        location: {
          coordinates: [22.5498, 72.9052],
          address: 'Karamsad Road, near Karamsad Civic Center, Anand, Gujarat 388121',
          ward: 'Ward 3 (Karamsad Area)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'POTHOLE',
          subCategory: 'Asphalt Disintegration',
          severity: 'HIGH',
          severityReason: 'Multiple deep road craters in succession on a high-traffic intercity connector road.',
          confidenceScore: 0.93,
          estimatedDimensions: {
            description: '5 craters, average depth 12cm',
            affectedAreaSqMeters: 15
          },
          immediateRisk: true,
          riskDescription: 'High risk of two-wheeler skid accidents and suspension damage.',
          suggestedDepartment: 'Roads & Infrastructure',
          officerSummary: 'Disintegrated asphalt stretch on Karamsad Road. Multiple deep voids requiring cold mix patching or complete resurfacing of the lane.',
          citizenSummary: 'Road damage on Karamsad Road has been verified by the community and is queued for patching.',
          tags: ['Pothole', 'Karamsad Road', 'Road Failure'],
          locationContext: 'Double lane section near the Karamsad medical college intersection',
          estimatedResolutionDays: 4
        },
        reportedBy: 'user_aarav',
        reportedByName: 'Aarav Patel',
        assignedTo: null,
        assignedToName: null,
        department: 'Roads & Infrastructure',
        verificationCount: 3,
        verifiers: ['user_priya', 'user_validator_2', 'user_validator_4'],
        upvotes: 9,
        upvoters: ['user_priya'],
        createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Pothole', 'Karamsad Road', 'Road Failure'],
        comments: [
          {
            id: 'c_6',
            author: 'Priya Sharma',
            authorRole: 'Validator',
            text: 'This section is extremely dangerous. I saw a scooter slip here this morning.',
            timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: []
      },
      {
        id: 'iss_7',
        title: 'Uncontrolled commercial garbage dumping on Borsad Chowkdi',
        description: 'Large commercial boxes, packing material, and plastic trash are being dumped on the corner of Borsad Chowkdi, obstructing the pedestrian path.',
        category: 'WASTE',
        severity: 'MEDIUM',
        status: 'SUBMITTED',
        location: {
          coordinates: [22.5401, 72.9299],
          address: 'Borsad Chowkdi Commercial Hub, Anand, Gujarat 388001',
          ward: 'Ward 5 (Borsad Chowkdi)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'WASTE',
          subCategory: 'Commercial Dumping',
          severity: 'MEDIUM',
          severityReason: 'Solid waste pile obstructing public walkways and creating an eyesore in a primary commercial hub.',
          confidenceScore: 0.92,
          estimatedDimensions: {
            description: 'Commercial debris pile, ~4 cubic meters',
            affectedAreaSqMeters: 6
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Waste Management',
          officerSummary: 'Debris dumping on pedestrian path corner at Borsad Chowkdi. Commercial packaging and plastic containers. Needs garbage collection team dispatch.',
          citizenSummary: 'Waste accumulation reported. Assessed by AI as Medium severity. Routed to Sanitation.',
          tags: ['Garbage', 'Sanitation', 'Borsad Chowkdi'],
          locationContext: 'Pedestrian pavement corner next to retail shops',
          estimatedResolutionDays: 2
        },
        reportedBy: 'user_aarav',
        reportedByName: 'Aarav Patel',
        assignedTo: null,
        assignedToName: null,
        department: 'Waste Management',
        verificationCount: 0,
        verifiers: [],
        upvotes: 5,
        upvoters: [],
        createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Garbage', 'Sanitation', 'Borsad Chowkdi'],
        comments: [],
        progressUpdates: []
      },
      {
        id: 'iss_8',
        title: 'Flickering streetlights on Lambhvel Road',
        description: 'Two consecutive streetlights on Lambhvel Road are constantly flickering. This creates an irritating strobe effect and leaves the road partially dark, reducing visibility.',
        category: 'STREETLIGHT',
        severity: 'LOW',
        status: 'SUBMITTED',
        location: {
          coordinates: [22.5822, 72.9345],
          address: 'Lambhvel Road, near Lambhvel Temple Garden, Anand, Gujarat 388310',
          ward: 'Ward 4 (Lambhvel Area)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1509024644558-2f56ce76c490?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'STREETLIGHT',
          subCategory: 'Flickering LED lamp',
          severity: 'LOW',
          severityReason: 'Electrical component failure in street lighting poles. Non-urgent.',
          confidenceScore: 0.88,
          estimatedDimensions: {
            description: '2 flickering lighting units',
            affectedAreaSqMeters: null
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Electricity',
          officerSummary: 'Poles #SL-12 and #SL-13 are flickering due to a loose contact or chocking module failure. Scheduled standard bulb/chock replacement.',
          citizenSummary: 'Streetlight flickering issue logged. Routed to electricity department.',
          tags: ['Streetlight', 'Lambhvel Road', 'Flickering'],
          locationContext: 'Residential lane section near temple park crossing',
          estimatedResolutionDays: 5
        },
        reportedBy: 'user_priya',
        reportedByName: 'Priya Sharma',
        assignedTo: null,
        assignedToName: null,
        department: 'Electricity',
        verificationCount: 0,
        verifiers: [],
        upvotes: 4,
        upvoters: [],
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Streetlight', 'Lambhvel Road', 'Flickering'],
        comments: [],
        progressUpdates: []
      },
      {
        id: 'iss_9',
        title: 'Clogged drainage canal overflow in Lambhvel Area',
        description: 'The secondary drainage canal running along Lambhvel Road is completely clogged with weeds and plastic bags, causing dirty water to spill onto the main road.',
        category: 'WASTE',
        severity: 'HIGH',
        status: 'ASSIGNED',
        location: {
          coordinates: [22.5891, 72.9312],
          address: 'Lambhvel Drainage Canal Avenue, Anand, Gujarat 388310',
          ward: 'Ward 4 (Lambhvel Area)'
        },
        mediaUrls: ['https://images.unsplash.com/photo-1567345711432-bfde26f6f0a4?q=80&w=600&auto=format&fit=crop'],
        aiAnalysis: {
          isValidIssue: true,
          isFakeOrManipulated: false,
          category: 'WASTE',
          subCategory: 'Clogged Canal',
          severity: 'HIGH',
          severityReason: 'Canal obstruction leading to graywater spillover on a public roadway, threatening local sanitation.',
          confidenceScore: 0.94,
          estimatedDimensions: {
            description: 'Canal block length ~12m, water spilling over ~30m',
            affectedAreaSqMeters: 45
          },
          immediateRisk: false,
          riskDescription: null,
          suggestedDepartment: 'Waste Management',
          officerSummary: 'Blockage in Lambhvel open drainage line. Debris and silt buildup. Excavator and cleaning crew assigned.',
          citizenSummary: 'Clogged canal graywater spillover logged. Waste management team assigned.',
          tags: ['Clogged Canal', 'Drainage', 'Overflow', 'Sanitation'],
          locationContext: 'Open stormwater canal line next to residential access lanes',
          estimatedResolutionDays: 3
        },
        reportedBy: 'user_aarav',
        reportedByName: 'Aarav Patel',
        assignedTo: 'user_patil',
        assignedToName: 'Officer Anita Patil',
        department: 'Waste Management',
        verificationCount: 4,
        verifiers: ['user_priya', 'user_validator_2', 'user_validator_7', 'user_validator_8'],
        upvotes: 15,
        upvoters: ['user_priya'],
        createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        resolvedAt: null,
        tags: ['Clogged Canal', 'Drainage', 'Overflow'],
        comments: [
          {
            id: 'c_9',
            author: 'Officer Anita Patil',
            authorRole: 'Officer',
            text: 'Sanitation cleaning crew has been dispatched to clear the weeds and plastic blockages in the Lambhvel open canal channel.',
            timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
          }
        ],
        progressUpdates: [
          {
            status: 'ASSIGNED',
            notes: 'Canal cleaning team dispatched to clear blockages.',
            timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            updatedBy: 'Officer Anita Patil'
          }
        ]
      }
    ];

    const notifications: Notification[] = [
      {
        id: 'not_1',
        userId: 'user_aarav',
        title: 'Welcome to CivicPulse! ⚡',
        message: 'Report infrastructure issues, verify nearby reports, and earn XP badges to help improve your community.',
        createdAt: new Date().toISOString(),
        read: false,
        type: 'gamification'
      }
    ];

    return { users, issues, notifications };
  }

  private async seedFirestore() {
    if (!firestore) return;
    const { users, issues, notifications } = this.getSeedData();
    const batch = firestore.batch();

    users.forEach(u => {
      const ref = firestore!.collection('users').doc(u.uid);
      batch.set(ref, u);
    });

    issues.forEach(i => {
      const ref = firestore!.collection('issues').doc(i.id);
      batch.set(ref, i);
    });

    notifications.forEach(n => {
      const ref = firestore!.collection('notifications').doc(n.id);
      batch.set(ref, n);
    });

    await batch.commit();
    console.log("Google Cloud Firestore successfully seeded with standard data.");
  }

  private async seedMongo() {
    const { users, issues, notifications } = this.getSeedData();
    await UserModel.insertMany(users);
    await IssueModel.insertMany(issues);
    await NotificationModel.insertMany(notifications);
    console.log("MongoDB successfully seeded with standard data.");
  }

  private async seed() {
    this.schema = this.getSeedData();
    await this.save();
  }

  // User Operations
  async getUsers(): Promise<UserProfile[]> {
    await this.init();
    if (isMongo) {
      const users = await UserModel.find({});
      return users.map(u => u.toObject()) as UserProfile[];
    }
    if (firestore) {
      const snap = await firestore.collection('users').get();
      const list: UserProfile[] = [];
      snap.forEach((doc: any) => {
        list.push(doc.data() as UserProfile);
      });
      return list;
    }
    return this.schema.users;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    await this.init();
    if (isMongo) {
      const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
      return user ? (user.toObject() as UserProfile) : null;
    }
    if (firestore) {
      const snap = await firestore.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
      if (snap.empty) return null;
      return snap.docs[0].data() as UserProfile;
    }
    const user = this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    return user || null;
  }

  async getUserById(uid: string): Promise<UserProfile | null> {
    await this.init();
    if (isMongo) {
      const user = await UserModel.findOne({ uid });
      return user ? (user.toObject() as UserProfile) : null;
    }
    if (firestore) {
      const doc = await firestore.collection('users').doc(uid).get();
      if (!doc.exists) return null;
      return doc.data() as UserProfile;
    }
    const user = this.schema.users.find(u => u.uid === uid);
    return user || null;
  }

  async createUser(user: UserProfile): Promise<UserProfile> {
    await this.init();
    if (isMongo) {
      await UserModel.create(user);
      return user;
    }
    if (firestore) {
      await firestore.collection('users').doc(user.uid).set(user);
      return user;
    }
    this.schema.users.push(user);
    await this.save();
    return user;
  }

  async updateUser(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
    await this.init();
    if (isMongo) {
      const updated = await UserModel.findOneAndUpdate({ uid }, { $set: data }, { new: true });
      if (!updated) throw new Error("User not found");
      return updated.toObject() as UserProfile;
    }
    if (firestore) {
      await firestore.collection('users').doc(uid).update(data);
      const updated = await this.getUserById(uid);
      if (!updated) throw new Error("User not found");
      return updated;
    }
    const index = this.schema.users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error("User not found");
    const updated = { ...this.schema.users[index], ...data };
    this.schema.users[index] = updated;
    await this.save();
    return updated;
  }

  // Issue Operations
  async getIssues(): Promise<Issue[]> {
    await this.init();
    if (isMongo) {
      const issues = await IssueModel.find({}).sort({ createdAt: -1 });
      return issues.map(i => i.toObject()) as Issue[];
    }
    if (firestore) {
      const snap = await firestore.collection('issues').orderBy('createdAt', 'desc').get();
      const list: Issue[] = [];
      snap.forEach((doc: any) => {
        list.push(doc.data() as Issue);
      });
      return list;
    }
    return this.schema.issues;
  }

  async getIssueById(id: string): Promise<Issue | null> {
    await this.init();
    if (isMongo) {
      const issue = await IssueModel.findOne({ id });
      return issue ? (issue.toObject() as Issue) : null;
    }
    if (firestore) {
      const doc = await firestore.collection('issues').doc(id).get();
      if (!doc.exists) return null;
      return doc.data() as Issue;
    }
    return this.schema.issues.find(i => i.id === id) || null;
  }

  async createIssue(issue: Issue): Promise<Issue> {
    await this.init();
    if (isMongo) {
      await IssueModel.create(issue);
      return issue;
    }
    if (firestore) {
      await firestore.collection('issues').doc(issue.id).set(issue);
      return issue;
    }
    this.schema.issues.unshift(issue);
    await this.save();
    return issue;
  }

  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue> {
    await this.init();
    if (isMongo) {
      const updated = await IssueModel.findOneAndUpdate({ id }, { $set: data }, { new: true });
      if (!updated) throw new Error("Issue not found");
      return updated.toObject() as Issue;
    }
    if (firestore) {
      await firestore.collection('issues').doc(id).update(data);
      const updated = await this.getIssueById(id);
      if (!updated) throw new Error("Issue not found");
      return updated;
    }
    const index = this.schema.issues.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Issue not found");
    const updated = { ...this.schema.issues[index], ...data };
    this.schema.issues[index] = updated;
    await this.save();
    return updated;
  }

  // Notification Operations
  async getNotifications(userId: string): Promise<Notification[]> {
    await this.init();
    if (isMongo) {
      const notifs = await NotificationModel.find({ userId }).sort({ createdAt: -1 });
      return notifs.map(n => n.toObject()) as Notification[];
    }
    if (firestore) {
      const snap = await firestore.collection('notifications').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
      const list: Notification[] = [];
      snap.forEach((doc: any) => {
        list.push(doc.data() as Notification);
      });
      return list;
    }
    return this.schema.notifications.filter(n => n.userId === userId);
  }

  async createNotification(notification: Notification): Promise<Notification> {
    await this.init();
    if (isMongo) {
      await NotificationModel.create(notification);
      return notification;
    }
    if (firestore) {
      await firestore.collection('notifications').doc(notification.id).set(notification);
      return notification;
    }
    this.schema.notifications.unshift(notification);
    await this.save();
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.init();
    if (isMongo) {
      await NotificationModel.findOneAndUpdate({ id }, { $set: { read: true } });
      return;
    }
    if (firestore) {
      await firestore.collection('notifications').doc(id).update({ read: true });
      return;
    }
    this.schema.notifications = this.schema.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    await this.save();
  }

  async clearNotifications(userId: string): Promise<void> {
    await this.init();
    if (isMongo) {
      await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
      return;
    }
    if (firestore) {
      const snap = await firestore.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
      const batch = firestore.batch();
      snap.forEach((doc: any) => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
      return;
    }
    this.schema.notifications = this.schema.notifications.map(n =>
      n.userId === userId ? { ...n, read: true } : n
    );
    await this.save();
  }
}

export const db = new DatabaseManager();
export default db;
