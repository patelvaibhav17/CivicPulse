import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserProfile } from '../types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'civicpulse_secret_key';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone, role, ward } = req.body;

  try {
    if (!name || !email || !password || !role || !ward) {
      return res.status(400).json({ error: "Missing required registration parameters." });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const uid = `user_cust_${Date.now()}`;

    const newUser: UserProfile = {
      uid,
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      role,
      ward,
      trustScore: 80,
      xp: 0,
      streakCount: 1,
      badges: [],
      reportedCount: 0,
      verifiedCount: 0
    };

    await db.createUser(newUser);

    // Auto seed welcome notification
    await db.createNotification({
      id: `not_welcome_${Date.now()}`,
      userId: uid,
      title: `Account Activated! 🛡️`,
      message: `Welcome ${name}! Your account is initialized in ${ward}. Start contributing to earn badges.`,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'gamification'
    });

    const token = jwt.sign({ uid, role }, JWT_SECRET, { expiresIn: '7d' });

    // Send profile data without the hashed password
    const { password: _, ...profile } = newUser;
    return res.status(201).json({ token, user: profile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Registration failed." });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Account with this email does not exist." });
    }

    const isMatch = bcrypt.compareSync(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...profile } = user;
    return res.json({ token, user: profile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Login failed." });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized access context." });
    }

    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const { password: _, ...profile } = user;
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve profile data." });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, ward, password } = req.body;

  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized access context." });
    }

    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const updates: Partial<UserProfile> = {};
    if (name) updates.name = name;
    if (email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser && existingUser.uid !== req.userId) {
        return res.status(400).json({ error: "Email is already taken by another account." });
      }
      updates.email = email;
    }
    if (phone !== undefined) updates.phone = phone;
    if (ward) updates.ward = ward;
    if (password) {
      // Re-hash password if it's set and has changed
      updates.password = bcrypt.hashSync(password, 10);
    }

    const updatedUser = await db.updateUser(req.userId, updates);

    const { password: _, ...profile } = updatedUser;
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update profile settings." });
  }
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized access context." });
    }
    const notifs = await db.getNotifications(req.userId);
    return res.json(notifs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve notifications." });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized access context." });
    }
    await db.markNotificationRead(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to mark notification as read." });
  }
};

export const clearNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized access context." });
    }
    await db.clearNotifications(req.userId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to clear notifications." });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const list = await db.getUsers();
    const clean = list.map(({ password: _, ...u }) => u);
    return res.json(clean);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve users." });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  const { role } = req.body;
  try {
    if (req.userRole !== 'Admin') {
      return res.status(403).json({ error: "Admin access required." });
    }
    if (!['Citizen', 'Validator', 'Officer', 'Admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }
    const updated = await db.updateUser(uid, { role });
    const { password: _, ...profile } = updated;
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update user role." });
  }
};
