import { Response } from 'express';
import { db } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Issue, Comment, Status, UserProfile } from '../types/index';

// â”€â”€â”€ Badge Award Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
}

const awardBadges = (user: UserProfile, newXP: number, context: {
  reportedCount?: number;
  verifiedCount?: number;
  category?: string;
  isResolved?: boolean;
}): { badges: Badge[]; notifications: { title: string; message: string }[] } => {
  const badges = [...(user.badges || [])] as Badge[];
  const notifications: { title: string; message: string }[] = [];
  const now = new Date().toISOString();

  const hasBadge = (id: string) => badges.some(b => b.id === id);
  const addBadge = (badge: Badge) => {
    badges.push(badge);
    notifications.push({
      title: `Badge Unlocked: ${badge.name} ${badge.icon}`,
      message: `Congratulations! You earned the "${badge.name}" badge for civic contributions.`
    });
  };

  const reportedCount = context.reportedCount ?? user.reportedCount;
  const verifiedCount = context.verifiedCount ?? user.verifiedCount;

  // First Report badge
  if (reportedCount >= 1 && !hasBadge('first_report')) {
    addBadge({ id: 'first_report', name: 'First Report', icon: 'ðŸŒ±', description: 'Submitted your first civic report', unlockedAt: now });
  }
  // Pothole Spotter badge
  if (reportedCount >= 2 && context.category === 'POTHOLE' && !hasBadge('pothole_spotter')) {
    addBadge({ id: 'pothole_spotter', name: 'Pothole Spotter', icon: 'ðŸ•³ï¸', description: 'Reported 2+ potholes successfully', unlockedAt: now });
  }
  // Water Guardian badge
  if (context.category === 'WATER_LEAK' && !hasBadge('water_guardian')) {
    addBadge({ id: 'water_guardian', name: 'Water Guardian', icon: 'ðŸ’§', description: 'Reported a water infrastructure issue', unlockedAt: now });
  }
  // Waste Warrior badge
  if (context.category === 'WASTE' && !hasBadge('waste_warrior')) {
    addBadge({ id: 'waste_warrior', name: 'Waste Warrior', icon: 'â™»ï¸', description: 'Reported a waste management issue', unlockedAt: now });
  }
  // Community Guardian badge (10+ verifications)
  if (verifiedCount >= 10 && !hasBadge('community_guardian')) {
    addBadge({ id: 'community_guardian', name: 'Community Guardian', icon: 'ðŸ›¡ï¸', description: 'Verified over 10 reported issues', unlockedAt: now });
  }
  // Problem Solver badge (first issue resolved)
  if (context.isResolved && !hasBadge('problem_solver')) {
    addBadge({ id: 'problem_solver', name: 'Problem Solver', icon: 'ðŸ”§', description: 'Had your first reported issue resolved', unlockedAt: now });
  }
  // XP milestone badges
  if (newXP >= 150 && !hasBadge('level_bronze')) {
    addBadge({ id: 'level_bronze', name: 'Bronze Contributor', icon: 'ðŸ¥‰', description: 'Reached 150 XP for civic support', unlockedAt: now });
  }
  if (newXP >= 500 && !hasBadge('level_silver')) {
    addBadge({ id: 'level_silver', name: 'Silver Guardian', icon: 'ðŸ¥ˆ', description: 'Reached 500 XP in public safety reporting', unlockedAt: now });
  }
  if (newXP >= 1000 && !hasBadge('level_gold')) {
    addBadge({ id: 'level_gold', name: 'Gold Champion', icon: 'ðŸ¥‡', description: 'Reached 1000 XP â€” true community champion!', unlockedAt: now });
  }

  return { badges, notifications };
};

// â”€â”€â”€ Controllers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getIssues = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getIssues();
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve issues list." });
  }
};

export const getIssueById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const issue = await db.getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found." });
    return res.json(issue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve issue details." });
  }
};

export const createIssue = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, severity, coordinates, address, mediaUrls, aiAnalysis } = req.body;

  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized access context." });

    const reporter = await db.getUserById(req.userId);
    if (!reporter) return res.status(404).json({ error: "Reporter profile not found." });

    if (!title || !category || !severity || !coordinates || !address || !aiAnalysis) {
      return res.status(400).json({ error: "Missing required issue creation fields." });
    }

    const ward = reporter.ward.includes('Headquarters') ? 'Ward 1 (Vallabh Vidyanagar)' : reporter.ward;

    const newIssue: Issue = {
      id: `iss_${Date.now()}`,
      title,
      description: description || "Reported via CivicPulse.",
      category,
      severity,
      status: 'SUBMITTED',
      location: { coordinates, address, ward },
      mediaUrls: mediaUrls || [],
      aiAnalysis,
      reportedBy: reporter.uid,
      reportedByName: reporter.name,
      assignedTo: null,
      assignedToName: null,
      department: aiAnalysis.suggestedDepartment,
      verificationCount: 0,
      verifiers: [],
      upvotes: 0,
      upvoters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      tags: aiAnalysis.tags || [],
      comments: [{
        id: `c_init_${Date.now()}`,
        author: 'System (Gemini AI)',
        authorRole: 'Admin',
        text: `Issue auto-categorized as [${category}] Â· Severity: [${severity}] Â· Dept: [${aiAnalysis.suggestedDepartment}] Â· ${aiAnalysis.officerSummary}`,
        timestamp: new Date().toISOString()
      }],
      progressUpdates: []
    };

    await db.createIssue(newIssue);

    // Award XP and check badges
    const newXP = reporter.xp + 10;
    const newReportedCount = reporter.reportedCount + 1;
    const { badges, notifications: badgeNotifs } = awardBadges(reporter, newXP, {
      reportedCount: newReportedCount,
      category
    });

    await db.updateUser(reporter.uid, { reportedCount: newReportedCount, xp: newXP, badges });

    await db.createNotification({
      id: `not_xp_${Date.now()}`,
      userId: reporter.uid,
      title: 'Earned +10 XP! ðŸŽ¯',
      message: 'XP awarded for submitting a community report.',
      createdAt: new Date().toISOString(),
      read: false,
      type: 'gamification'
    });

    for (const n of badgeNotifs) {
      await db.createNotification({
        id: `not_badge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: reporter.uid,
        title: n.title,
        message: n.message,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'gamification'
      });
    }

    // Notify validators
    const allUsers = await db.getUsers();
    for (const user of allUsers) {
      if (user.role === 'Validator' && user.uid !== reporter.uid) {
        await db.createNotification({
          id: `not_val_${Date.now()}_${user.uid}`,
          userId: user.uid,
          title: 'Nearby Verification Requested ðŸ“',
          message: `A new ${category.toLowerCase()} issue was reported near your area. Can you verify it?`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'verification',
          issueId: newIssue.id
        });
      }
    }

    return res.status(201).json(newIssue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to log issue." });
  }
};

export const verifyIssue = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { confirmed, notes, mediaUrl } = req.body;

  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized access context." });

    const user = await db.getUserById(req.userId);
    if (!user || user.role === 'Officer' || user.role === 'Admin') {
      return res.status(403).json({ error: "Only Citizens and Validators can verify issues." });
    }

    const issue = await db.getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found." });

    if (issue.verifiers.includes(user.uid)) {
      return res.status(400).json({ error: "You have already verified this issue." });
    }

    const newVerifiers = [...issue.verifiers, user.uid];
    const newVerificationCount = confirmed ? issue.verificationCount + 1 : issue.verificationCount;
    let newStatus = issue.status;
    const newComments = [...issue.comments];

    newComments.push({
      id: `c_ver_${Date.now()}`,
      author: user.name,
      authorRole: user.role,
      text: `Community Verification: ${confirmed ? 'CONFIRMED âœ…' : 'DISPUTED âŒ'}. Note: "${notes || 'Verified at location.'}"${mediaUrl ? ' (Evidence attached)' : ''}`,
      timestamp: new Date().toISOString(),
      mediaUrl
    });

    let promoted = false;
    if (confirmed && newVerificationCount >= 3 && issue.status === 'SUBMITTED') {
      newStatus = 'VERIFIED';
      promoted = true;
      newComments.push({
        id: `c_sys_${Date.now()}`,
        author: 'System',
        authorRole: 'Admin',
        text: `Issue promoted to VERIFIED status â€” 3 community confirmations received. Dispatched to Municipal Officer queue.`,
        timestamp: new Date().toISOString()
      });
    }

    const updatedIssue = await db.updateIssue(id, {
      verifiers: newVerifiers,
      verificationCount: newVerificationCount,
      status: newStatus,
      comments: newComments,
      updatedAt: new Date().toISOString()
    });

    // Award verifier +5 XP
    const newVerifierXP = user.xp + 5;
    const newVerifiedCount = user.verifiedCount + 1;
    const { badges: vBadges, notifications: vBadgeNotifs } = awardBadges(user, newVerifierXP, { verifiedCount: newVerifiedCount });

    await db.updateUser(user.uid, { verifiedCount: newVerifiedCount, xp: newVerifierXP, badges: vBadges });

    await db.createNotification({
      id: `not_xp_v_${Date.now()}`,
      userId: user.uid,
      title: 'Earned +5 XP! ðŸŽ¯',
      message: 'XP awarded for verifying a community report.',
      createdAt: new Date().toISOString(),
      read: false,
      type: 'gamification'
    });

    for (const n of vBadgeNotifs) {
      await db.createNotification({
        id: `not_badge_v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.uid,
        title: n.title,
        message: n.message,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'gamification'
      });
    }

    // If promoted, reward reporter +25 XP
    if (promoted) {
      const reporter = await db.getUserById(issue.reportedBy);
      if (reporter) {
        const newRXP = reporter.xp + 25;
        const { badges: rBadges, notifications: rBadgeNotifs } = awardBadges(reporter, newRXP, {
          reportedCount: reporter.reportedCount, category: issue.category
        });
        await db.updateUser(reporter.uid, { xp: newRXP, badges: rBadges });

        await db.createNotification({
          id: `not_promo_${Date.now()}`,
          userId: reporter.uid,
          title: 'Report Verified! ðŸŒŸ (+25 XP)',
          message: `"${issue.title}" received 3 confirmations and is now in the Municipal Officer queue.`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'status',
          issueId: id
        });

        for (const n of rBadgeNotifs) {
          await db.createNotification({
            id: `not_badge_r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId: reporter.uid,
            title: n.title,
            message: n.message,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'gamification'
          });
        }
      }
    }

    return res.json(updatedIssue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to log verification." });
  }
};

export const upvoteIssue = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized access context." });
    const issue = await db.getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found." });

    const isUpvoted = issue.upvoters.includes(req.userId);
    const newUpvoters = isUpvoted
      ? issue.upvoters.filter(uid => uid !== req.userId)
      : [...issue.upvoters, req.userId];

    const updatedIssue = await db.updateIssue(id, { upvoters: newUpvoters, upvotes: newUpvoters.length });
    return res.json(updatedIssue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update upvote." });
  }
};

export const updateIssueStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes, mediaUrl } = req.body;

  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized access context." });

    const officer = await db.getUserById(req.userId);
    if (!officer || (officer.role !== 'Officer' && officer.role !== 'Admin')) {
      return res.status(403).json({ error: "Only Officers and Admins can update status." });
    }

    const issue = await db.getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found." });

    const newProgress = [
      ...issue.progressUpdates,
      { status, notes: notes || '', mediaUrl, timestamp: new Date().toISOString(), updatedBy: officer.name }
    ];

    const newComments = [
      ...issue.comments,
      {
        id: `c_status_${Date.now()}`,
        author: officer.name,
        authorRole: officer.role,
        text: `Status updated to [${status}].${notes ? ` Update: "${notes}"` : ''}`,
        timestamp: new Date().toISOString(),
        mediaUrl
      }
    ];

    const resolvedAt = (status === 'RESOLVED' || status === 'CLOSED') ? new Date().toISOString() : issue.resolvedAt;
    const assignedTo = status === 'ASSIGNED' ? officer.uid : issue.assignedTo;
    const assignedToName = status === 'ASSIGNED' ? officer.name : issue.assignedToName;

    const updatedIssue = await db.updateIssue(id, {
      status, resolvedAt, assignedTo, assignedToName,
      progressUpdates: newProgress, comments: newComments,
      updatedAt: new Date().toISOString()
    });

    if (status === 'RESOLVED') {
      const reporter = await db.getUserById(issue.reportedBy);
      if (reporter) {
        const newRXP = reporter.xp + 15;
        const { badges: rBadges, notifications: rBadgeNotifs } = awardBadges(reporter, newRXP, {
          reportedCount: reporter.reportedCount, category: issue.category, isResolved: true
        });
        await db.updateUser(reporter.uid, { xp: newRXP, badges: rBadges });

        await db.createNotification({
          id: `not_res_${Date.now()}`,
          userId: reporter.uid,
          title: 'Issue Resolved! ðŸŽ‰ (+15 XP)',
          message: `Municipal team resolved "${issue.title}". Thank you for making your community better!`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'status',
          issueId: id
        });

        for (const n of rBadgeNotifs) {
          await db.createNotification({
            id: `not_badge_res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId: reporter.uid,
            title: n.title,
            message: n.message,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'gamification'
          });
        }
      }

      for (const verifierId of issue.verifiers) {
        if (verifierId !== issue.reportedBy) {
          await db.createNotification({
            id: `not_res_v_${Date.now()}_${verifierId}`,
            userId: verifierId,
            title: 'Verified Issue Resolved! ðŸ”§',
            message: `"${issue.title}" that you helped verify has been marked RESOLVED.`,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'status',
            issueId: id
          });
        }
      }
    } else {
      await db.createNotification({
        id: `not_status_${Date.now()}`,
        userId: issue.reportedBy,
        title: `Status Update: ${status} ðŸ“Œ`,
        message: `"${issue.title}" moved to ${status}.${notes ? ` ${notes.substring(0, 100)}` : ''}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'status',
        issueId: id
      });
    }

    return res.json(updatedIssue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update status." });
  }
};

export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { text, mediaUrl } = req.body;
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized access context." });
    const user = await db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User profile not found." });
    const issue = await db.getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found." });

    const newComment: Comment = {
      id: `c_user_${Date.now()}`,
      author: user.name,
      authorRole: user.role,
      text,
      timestamp: new Date().toISOString(),
      mediaUrl
    };

    const updatedIssue = await db.updateIssue(id, {
      comments: [...issue.comments, newComment],
      updatedAt: new Date().toISOString()
    });
    return res.json(updatedIssue);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to add comment." });
  }
};

// Admin: update user role
export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  const { role } = req.body;
  try {
    if (req.userRole !== 'Admin') return res.status(403).json({ error: "Admin access required." });
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
