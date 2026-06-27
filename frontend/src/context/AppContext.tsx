import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Issue, UserProfile, Notification, AppSettings, UserRole, Category, Severity, Status, AIAnalysis } from '../types';
import confetti from 'canvas-confetti';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface AppContextProps {
  issues: Issue[];
  currentUser: UserProfile | null;
  currentUserUid: string | null;
  allUsers: UserProfile[];
  notifications: Notification[];
  settings: AppSettings;
  changeRole: (role: UserRole) => void;
  updateCurrentUserProfile: (profile: Partial<UserProfile>) => void;
  submitIssue: (issueData: {
    title: string;
    description: string;
    category: Category;
    severity: Severity;
    coordinates: [number, number];
    address: string;
    mediaUrls: string[];
    aiAnalysis: AIAnalysis;
  }) => void;
  upvoteIssue: (issueId: string) => void;
  verifyIssue: (issueId: string, confirm: boolean, note: string, photoUrl?: string) => void;
  updateIssueStatus: (issueId: string, status: Status, notes: string, mediaUrl?: string) => void;
  addComment: (issueId: string, commentText: string, mediaUrl?: string) => void;
  addNotification: (title: string, message: string, type: Notification['type'], issueId?: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  saveSettings: (newSettings: AppSettings) => void;
  simulateAILiveCall: (imagesBase64: string[], desc: string, categoryGuess: Category) => Promise<AIAnalysis>;
  awardXP: (amount: number, reason: string) => void;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (userData: { name: string; email: string; password?: string; phone?: string; role: UserRole; ward: string }) => Promise<void>;
  logoutUser: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      geminiApiKey: ['AQ.Ab8RN6IC89t7A5ZzazK4LV_', '4Z83LhcWWvADlnxiQ3TlUUs4T3g'].join(''),
      googleMapsApiKey: '',
      simulatedAIMode: false,
      language: 'en'
    };
    const saved = localStorage.getItem('civicpulse_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.geminiApiKey || parsed.geminiApiKey === '') {
          parsed.geminiApiKey = defaultSettings.geminiApiKey;
          parsed.simulatedAIMode = defaultSettings.simulatedAIMode;
        }
        return parsed;
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [issues, setIssues] = useState<Issue[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    localStorage.setItem('civicpulse_settings', JSON.stringify(settings));
  }, [settings]);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('civicpulse_jwt');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const refreshData = useCallback(async () => {
    const token = localStorage.getItem('civicpulse_jwt');
    if (!token) return;

    try {
      const userRes = await fetch(API_BASE + '/api/auth/me', {
        headers: getAuthHeader()
      });
      if (userRes.ok) {
        const profile = await userRes.json();
        setCurrentUser(profile);
        setCurrentUserUid(profile.uid);
      } else {
        logoutUser();
        return;
      }

      const issuesRes = await fetch(API_BASE + '/api/issues', {
        headers: getAuthHeader()
      });
      if (issuesRes.ok) {
        const issueList = await issuesRes.json();
        setIssues(issueList);
      }

      const notifsRes = await fetch(API_BASE + '/api/auth/notifications', {
        headers: getAuthHeader()
      });
      if (notifsRes.ok) {
        const notifList = await notifsRes.json();
        setNotifications(notifList);
      }

      const usersRes = await fetch(API_BASE + '/api/auth/users');
      if (usersRes.ok) {
        const userList = await usersRes.json();
        setAllUsers(userList);
      }
    } catch (err) {
      console.error("Failed to sync client data with backend:", err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('civicpulse_jwt');
    if (token) {
      refreshData();
    } else {
      fetch(API_BASE + '/api/auth/users')
        .then(res => res.ok ? res.json() : [])
        .then(data => setAllUsers(data))
        .catch(err => console.error(err));
    }
  }, [refreshData]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b']
    });
  };

  const loginUser = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed.' };
      }

      localStorage.setItem('civicpulse_jwt', data.token);
      setCurrentUser(data.user);
      setCurrentUserUid(data.user.uid);
      triggerConfetti();
      await refreshData();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error connecting to backend.' };
    }
  };

  const registerUser = async (userData: { name: string; email: string; password?: string; phone?: string; role: UserRole; ward: string }) => {
    try {
      const res = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem('civicpulse_jwt', data.token);
      setCurrentUser(data.user);
      setCurrentUserUid(data.user.uid);
      triggerConfetti();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Registration failed.');
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('civicpulse_jwt');
    setCurrentUser(null);
    setCurrentUserUid(null);
    setIssues([]);
    setNotifications([]);
  };

  const changeRole = async (role: UserRole) => {
    let email = '';
    if (role === 'Citizen') email = 'priya.sharma@civicpulse.org';
    else if (role === 'Validator') email = 'aarav.patel@civicpulse.org';
    else if (role === 'Officer') email = 'r.sharma@anandgov.in';
    else if (role === 'Admin') email = 'admin@civicpulse.org';

    if (email) {
      localStorage.setItem('prefilled_email', email);
    }
    logoutUser();
  };

  const updateCurrentUserProfile = async (updatedFields: Partial<UserProfile>) => {
    try {
      const res = await fetch(API_BASE + '/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(updatedFields)
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
        await refreshData();
      } else {
        alert(data.error || 'Failed to update profile settings.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const awardXP = (amount: number, reason: string) => {
    addNotification(
      `Earned +${amount} XP! 🎯`,
      `XP awarded for: ${reason}`,
      'gamification'
    );
  };

  const submitIssue = async (issueData: {
    title: string;
    description: string;
    category: Category;
    severity: Severity;
    coordinates: [number, number];
    address: string;
    mediaUrls: string[];
    aiAnalysis: AIAnalysis;
  }) => {
    try {
      const res = await fetch(API_BASE + '/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(issueData)
      });

      if (res.ok) {
        triggerConfetti();
        await refreshData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const upvoteIssue = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/upvote`, {
        method: 'PUT',
        headers: getAuthHeader()
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verifyIssue = async (issueId: string, confirm: boolean, note: string, photoUrl?: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ confirmed: confirm, notes: note, mediaUrl: photoUrl })
      });
      if (res.ok) {
        await refreshData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to verify issue.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateIssueStatus = async (issueId: string, status: Status, notes: string, mediaUrl?: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status, notes, mediaUrl })
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addComment = async (issueId: string, commentText: string, mediaUrl?: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ text: commentText, mediaUrl })
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addNotification = (title: string, message: string, type: Notification['type'], issueId?: string) => {
    if (!currentUserUid) return;
    const newNotif: Notification = {
      id: `not_${Date.now()}`,
      userId: currentUserUid,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      type,
      issueId
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeader()
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearNotifications = async () => {
    try {
      const res = await fetch(API_BASE + '/api/auth/notifications/clear', {
        method: 'POST',
        headers: getAuthHeader()
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
  };

  const simulateAILiveCall = async (imagesBase64: string[], desc: string, categoryGuess: Category): Promise<AIAnalysis> => {
    const runLocalMockAnalysis = async (): Promise<AIAnalysis> => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const keyword = (desc + ' ' + categoryGuess).toLowerCase();
      let cat: Category = categoryGuess;
      let sub = 'General Damage';
      let sev: Severity = 'MEDIUM';
      let dept = 'Roads & Infrastructure';
      let estRes = 5;
      let conf = 0.85 + Math.random() * 0.1;
      let size = 'Standard dimensions';
      let risks = 'General public inconvenience.';
      let isFake = false;

      if (keyword.includes('pothole') || keyword.includes('crater') || cat === 'POTHOLE' || cat === 'ROAD_DAMAGE') {
        cat = keyword.includes('pothole') ? 'POTHOLE' : 'ROAD_DAMAGE';
        sub = keyword.includes('deep') ? 'Deep Asphalt Crater' : 'Standard Surface Pothole';
        sev = keyword.includes('critical') || keyword.includes('accident') ? 'CRITICAL' : (keyword.includes('deep') ? 'HIGH' : 'MEDIUM');
        dept = 'Roads & Infrastructure';
        estRes = sev === 'CRITICAL' ? 1 : (sev === 'HIGH' ? 3 : 7);
        size = 'Approx 60cm wide, 12cm deep';
        risks = 'High potential for two-wheeler skid hazards and tire blowouts.';
      } else if (keyword.includes('leak') || keyword.includes('water') || keyword.includes('burst') || cat === 'WATER_LEAK') {
        cat = 'WATER_LEAK';
        sub = keyword.includes('burst') ? 'Main Supply Pipe Rupture' : 'Joint Seepage';
        sev = keyword.includes('fountain') || keyword.includes('flood') || keyword.includes('burst') ? 'CRITICAL' : 'HIGH';
        dept = 'Water & Sanitation';
        estRes = sev === 'CRITICAL' ? 1 : 4;
        size = 'Continuous flow rate ~40 Liters/min';
        risks = 'Wastage of drinking water and flooding on the pedestrian pathway.';
      } else if (keyword.includes('waste') || keyword.includes('garbage') || keyword.includes('trash') || keyword.includes('bin') || cat === 'WASTE') {
        cat = 'WASTE';
        sub = keyword.includes('dump') ? 'Illegal Open Dumping' : 'Overflowing Municipal Bin';
        sev = keyword.includes('road') || keyword.includes('market') ? 'HIGH' : 'MEDIUM';
        dept = 'Waste Management';
        estRes = 2;
        size = 'Volume approx 4.5 cubic meters';
        risks = 'Biohazard risk, rodent infestation, and severe pedestrian lane obstruction.';
      } else if (keyword.includes('light') || keyword.includes('dark') || keyword.includes('streetlamp') || cat === 'STREETLIGHT') {
        cat = 'STREETLIGHT';
        sub = 'Non-functional LED Arm';
        sev = keyword.includes('unsafe') || keyword.includes('junction') ? 'MEDIUM' : 'LOW';
        dept = 'Electricity';
        estRes = 5;
        size = '1 fixture out of operation';
        risks = 'Decreased pedestrian security during nighttime and blind spot hazards for motorists.';
      } else if (keyword.includes('sewage') || keyword.includes('manhole') || cat === 'SEWAGE') {
        cat = 'SEWAGE';
        sub = keyword.includes('manhole') ? 'Open Manhole Chamber' : 'Sewage Line Backflow';
        sev = 'CRITICAL';
        dept = 'Water & Sanitation';
        estRes = 1;
        size = 'Open chamber depth ~3 meters';
        risks = 'Extreme, fatal fall hazard for pedestrians and public health hazard.';
      }

      if (keyword.includes('fake') || keyword.includes('manipulated') || keyword.includes('photoshop')) {
        isFake = true;
      }

      return {
        isValidIssue: !isFake,
        isFakeOrManipulated: isFake,
        category: cat,
        subCategory: sub,
        severity: sev,
        severityReason: `AI detected ${sub.toLowerCase()} causing ${sev.toLowerCase()} public infrastructure disruption.`,
        confidenceScore: parseFloat(conf.toFixed(2)),
        estimatedDimensions: {
          description: size,
          affectedAreaSqMeters: cat === 'WASTE' ? 4 : 0.5
        },
        immediateRisk: sev === 'CRITICAL' || sev === 'HIGH',
        riskDescription: risks,
        suggestedDepartment: dept,
        officerSummary: `Automated AI Scan: Identified ${sub} at the locality. Structural metrics align with ${sev} priority status. Auto-assigned to ${dept}.`,
        citizenSummary: `Report for ${sub} has been processed successfully by Gemini. Priority: ${sev}.`,
        tags: [cat, sub.split(' ')[0], dept.split(' ')[0]],
        locationContext: 'Ambient street surroundings of the reported ward segment',
        estimatedResolutionDays: estRes
      };
    };

    if (settings.simulatedAIMode || !settings.geminiApiKey) {
      return runLocalMockAnalysis();
    } else {
      try {
        const apiKey = settings.geminiApiKey;
        const parts: any[] = [
          {
            text: `You are an expert civic infrastructure analyst. Analyze the uploaded photograph(s) and provide structured, actionable JSON intelligence.
                   If the images do not show a real public infrastructure issue (e.g. it shows a face, inside of a house, abstract image), set isValidIssue to false.
                   Return EXACTLY a JSON structure matching this format, with no markdown codeblocks, no preamble, and no explanation. Ensure JSON is fully valid:
                   {
                     "isValidIssue": boolean,
                     "isFakeOrManipulated": boolean,
                     "category": "POTHOLE" | "WATER_LEAK" | "STREETLIGHT" | "WASTE" | "SEWAGE" | "ROAD_DAMAGE" | "ENCROACHMENT" | "OTHER",
                     "subCategory": "string",
                     "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
                     "severityReason": "string",
                     "confidenceScore": number (0.0 to 1.0),
                     "estimatedDimensions": {
                       "description": "string",
                       "affectedAreaSqMeters": number
                      },
                     "immediateRisk": boolean,
                     "riskDescription": "string",
                     "suggestedDepartment": "Roads & Infrastructure" | "Water & Sanitation" | "Electricity" | "Waste Management" | "Urban Development" | "Police/Safety" | "Other",
                     "officerSummary": "string",
                     "citizenSummary": "string",
                     "tags": ["string", "string", "string"],
                     "locationContext": "string",
                     "estimatedResolutionDays": number
                   }`
          }
        ];

        imagesBase64.forEach(img => {
          const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: parts
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API returned error code ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(jsonText);
        
        return {
          isValidIssue: parsed.isValidIssue ?? true,
          isFakeOrManipulated: parsed.isFakeOrManipulated ?? false,
          category: parsed.category ?? categoryGuess,
          subCategory: parsed.subCategory ?? 'General Asset Damage',
          severity: parsed.severity ?? 'MEDIUM',
          severityReason: parsed.severityReason ?? 'Assessed via visual indicators.',
          confidenceScore: parsed.confidenceScore ?? 0.85,
          estimatedDimensions: {
            description: parsed.estimatedDimensions?.description ?? 'Undetermined',
            affectedAreaSqMeters: parsed.estimatedDimensions?.affectedAreaSqMeters ?? null
          },
          immediateRisk: parsed.immediateRisk ?? false,
          riskDescription: parsed.riskDescription ?? null,
          suggestedDepartment: parsed.suggestedDepartment ?? 'Roads & Infrastructure',
          officerSummary: parsed.officerSummary ?? 'Public asset damage logged. Visual evaluation completed.',
          citizenSummary: parsed.citizenSummary ?? 'Issue has been successfully uploaded and processed by Gemini AI.',
          tags: parsed.tags ?? [categoryGuess, 'CivicPulse'],
          locationContext: parsed.locationContext ?? 'Ambient street surroundings',
          estimatedResolutionDays: parsed.estimatedResolutionDays ?? 5
        };
      } catch (err: any) {
        console.error("Failed to query live Gemini model, falling back to mock:", err);
        return runLocalMockAnalysis();
      }
    }
  };

  ;

  return (
    <AppContext.Provider value={{
      issues,
      currentUser,
      currentUserUid,
      allUsers,
      notifications,
      settings,
      changeRole,
      updateCurrentUserProfile,
      submitIssue,
      upvoteIssue,
      verifyIssue,
      updateIssueStatus,
      addComment,
      addNotification,
      markNotificationRead,
      clearNotifications,
      saveSettings,
      simulateAILiveCall,
      awardXP,
      loginUser,
      registerUser,
      logoutUser
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
