import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { InteractiveMap } from '../components/InteractiveMap';
import { 
  Camera, 
  MapPin, 
  Mic, 
  MicOff,
  Bot, 
  Loader2, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import type { Category, AIAnalysis } from '../types';

interface ReportIssueProps {
  setActiveTab: (tab: string) => void;
}

const DEMO_PRESETS = [
  {
    name: 'Road Pothole',
    category: 'POTHOLE' as Category,
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop',
    icon: '🕳️'
  },
  {
    name: 'Water Main Leak',
    category: 'WATER_LEAK' as Category,
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
    icon: '💧'
  },
  {
    name: 'Waste Dump',
    category: 'WASTE' as Category,
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop',
    icon: '🗑️'
  },
  {
    name: 'Broken Streetlight',
    category: 'STREETLIGHT' as Category,
    imageUrl: 'https://images.unsplash.com/photo-1509024644558-2f56ce76c490?q=80&w=600&auto=format&fit=crop',
    icon: '💡'
  }
];

// Haversine Distance Formula
const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const ReportIssue: React.FC<ReportIssueProps> = ({ setActiveTab }) => {
  const { currentUser, submitIssue, simulateAILiveCall, issues, settings } = useApp();
  const { t } = useTranslation(settings.language);

  const [step, setStep] = useState<number>(1);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [duplicateReport, setDuplicateReport] = useState<any | null>(null);

  // Form State
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>(''); // main image shown / sent to AI
  const [category, setCategory] = useState<Category>('POTHOLE');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coordinates, setCoordinates] = useState<[number, number]>([22.5645, 72.9289]);
  const [address, setAddress] = useState<string>('Bhai Kaka Marg, Vallabh Vidyanagar, Anand, Gujarat 388120');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  
  // Voice-to-Text State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any | null>(null);

  // Check for duplicates before final step
  useEffect(() => {
    if (step === 5) {
      const duplicate = issues.find(issue => {
        if (issue.category !== category) return false;
        const dist = getDistanceMeters(
          coordinates[0], 
          coordinates[1], 
          issue.location.coordinates[0], 
          issue.location.coordinates[1]
        );
        return dist <= 100; // duplicate within 100m
      });
      setDuplicateReport(duplicate || null);
    }
  }, [step, coordinates, category, issues]);

  if (!currentUser) return null;

  // Capture current user location using standard Geolocation
  const handleGPSLock = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordinates([lat, lng]);

          // Fetch Nominatim address
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
            if (res.ok) {
              const data = await res.json();
              setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          } catch (e) {
            console.error(e);
          }
        },
        (error) => {
          console.warn("GPS lock error: using central Anand fallback", error);
        }
      );
    }
  };

  // Convert file upload to base64 (supports multiple, up to 5)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - selectedImages.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setSelectedImages(prev => {
          const next = [...prev, b64];
          if (!primaryImage) setPrimaryImage(b64);
          return next;
        });
        if (!primaryImage) setPrimaryImage(b64);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (idx: number) => {
    setSelectedImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (primaryImage === prev[idx]) {
        setPrimaryImage(next[0] || '');
      }
      return next;
    });
  };

  // Process selected image with Gemini AI
  const handleRunAIAnalysis = async () => {
    if (!primaryImage) return;

    setLoadingAI(true);
    setStep(2); // advance to AI step to show loader

    try {
      const analysis = await simulateAILiveCall(selectedImages.length > 0 ? selectedImages : [primaryImage], description, category);
      setAiAnalysis(analysis);
      setCategory(analysis.category);
      setTitle(analysis.subCategory + " detected by AI");
      // Lock GPS initially
      handleGPSLock();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  // Setup Web Speech API for voice-to-text dictation
  const handleToggleVoice = () => {
    if (isRecording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Detect dialect based on configuration
    if (settings.language === 'hi') {
      recognition.lang = 'hi-IN'; // Hindi India
    } else if (settings.language === 'gu') {
      recognition.lang = 'gu-IN'; // Gujarati India
    } else {
      recognition.lang = 'en-IN'; // English India
    }

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setDescription(prev => prev ? prev + ' ' + text : text);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const handleFinalSubmit = () => {
    if (!aiAnalysis) return;
    submitIssue({
      title: title || aiAnalysis.subCategory + " reported",
      description: description || "Reported via CivicPulse.",
      category,
      severity: aiAnalysis.severity,
      coordinates,
      address,
      mediaUrls: selectedImages.length > 0 ? selectedImages : (primaryImage ? [primaryImage] : []),
      aiAnalysis
    });
    setActiveTab('dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Wizard Header */}
      <div className="bg-slate-900 border-b border-white/5 px-6 py-4.5 flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-base text-slate-100 uppercase tracking-wide">
            File Infrastructure Report
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Step {step} of 5</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`w-4 h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-brand-500 shadow-glow-primary/20' : s < step ? 'bg-brand-500/40' : 'bg-slate-800'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Step Contents */}
      <div className="p-6">
        
        {/* STEP 1: Select/Upload Image */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-display font-bold text-sm text-slate-300">1. Select or Upload Photos (up to 5)</h3>
            
            {/* Presets Grid for testing */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2.5">
                Quick Test Sandbox Presets (No file uploads required)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      if (!selectedImages.includes(preset.imageUrl)) {
                        setSelectedImages(prev => prev.length < 5 ? [...prev, preset.imageUrl] : prev);
                        if (!primaryImage) setPrimaryImage(preset.imageUrl);
                      }
                      setCategory(preset.category);
                    }}
                    className={`p-3 border rounded-xl bg-slate-900/60 transition text-left flex flex-col items-center justify-center gap-2 group ${
                      selectedImages.includes(preset.imageUrl)
                        ? 'border-brand-500 bg-brand-950/20 text-brand-300 shadow-glow-primary/5' 
                        : 'border-white/5 hover:border-white/10 hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition duration-200">{preset.icon}</span>
                    <span className="text-[10px] font-bold text-slate-300 text-center">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom file drop */}
            {selectedImages.length < 5 && (
              <div className="border-2 border-dashed border-white/10 hover:border-brand-500/40 rounded-2xl p-6 text-center transition bg-slate-950/20">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  id="file-upload-input"
                  className="hidden"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-800 text-brand-400 rounded-xl mb-1 border border-white/5">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Upload photographs ({selectedImages.length}/5)</span>
                  <span className="text-[10px] text-slate-500">Supports JPG, PNG, HEIC · Max 5 images</span>
                </label>
              </div>
            )}

            {/* Multi-Photo Thumbnail Strip */}
            {selectedImages.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Selected Photos — Click thumbnail to set as primary (AI analysis image)</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className={`relative group rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      primaryImage === img ? 'border-brand-500 shadow-glow-primary/20' : 'border-white/10 hover:border-white/20'
                    }`} style={{ width: 96, height: 72 }} onClick={() => setPrimaryImage(img)}>
                      <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {primaryImage === img && (
                        <div className="absolute bottom-0 left-0 right-0 bg-brand-600/80 text-center text-[9px] font-bold text-white py-0.5">PRIMARY</div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        className="absolute top-1 right-1 bg-black/70 text-rose-400 text-[9px] font-bold rounded px-1 opacity-0 group-hover:opacity-100 transition"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advance Button */}
            <button
              onClick={handleRunAIAnalysis}
              disabled={!primaryImage}
              className="w-full mt-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 font-bold rounded-xl shadow-glow-primary/10 transition flex items-center justify-center gap-2 text-xs"
            >
              Run Gemini Vision Diagnostics <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: AI Analyzing Loading & Review */}
        {step === 2 && (
          <div className="space-y-6">
            {loadingAI ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                <div className="space-y-1.5 animate-pulse">
                  <h4 className="font-display font-extrabold text-sm text-slate-200">Gemini Vision parsing image context...</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Running structural metadata detection</p>
                </div>
                
                {/* Visual loading bars */}
                <div className="w-full max-w-xs space-y-2 pt-4">
                  <div className="w-full bg-slate-900 rounded-full h-2 animate-shimmer" />
                  <div className="w-4/5 bg-slate-900 rounded-full h-2 animate-shimmer" />
                  <div className="w-3/4 bg-slate-900 rounded-full h-2 animate-shimmer" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-brand-950/20 border border-brand-500/30 rounded-xl">
                  <Bot className="w-5 h-5 text-brand-400 shrink-0" />
                  <span className="text-xs font-bold text-brand-300">Gemini Pro Vision Classification Complete!</span>
                </div>

                {/* AI Review Fields */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-white/5 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">Detected Category</label>
                    <div className="flex gap-2">
                      <span className="bg-brand-600 text-white font-bold px-3 py-1 rounded-lg uppercase">
                        {aiAnalysis?.category}
                      </span>
                      <span className="bg-slate-800 text-slate-300 font-semibold px-3 py-1 rounded-lg">
                        {aiAnalysis?.subCategory}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-500 block mb-1">Severity Assessment</label>
                      <span className={`inline-block font-extrabold px-2.5 py-0.5 rounded border uppercase ${
                        aiAnalysis?.severity === 'CRITICAL' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' :
                        aiAnalysis?.severity === 'HIGH' ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' :
                        'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                      }`}>
                        {aiAnalysis?.severity}
                      </span>
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-1">Immediate Risk Detected</label>
                      <span className={`inline-block font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                        aiAnalysis?.immediateRisk ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {aiAnalysis?.immediateRisk ? '🚨 HIGH RISK ALERT' : 'Standard'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Visual Dimensions Estimate</label>
                    <p className="font-semibold text-slate-200">{aiAnalysis?.estimatedDimensions?.description}</p>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Suggested Municipal Router</label>
                    <p className="font-semibold text-brand-300">{aiAnalysis?.suggestedDepartment}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <label className="text-slate-500 block mb-1">Diagnostic Abstract (Officer Summary)</label>
                    <p className="italic text-slate-400">"{aiAnalysis?.officerSummary}"</p>
                  </div>
                </div>

                {/* Confirm & Manual override toggle */}
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Resubmit Image
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-glow-primary/10 transition flex items-center justify-center gap-1"
                  >
                    Confirm & Select Location <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Pin GPS Location */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-300">3. Geolocation & Pin drop</h3>
              <button
                onClick={handleGPSLock}
                className="text-[10px] font-extrabold uppercase bg-brand-600/20 border border-brand-500/30 text-brand-300 px-3 py-1 rounded-lg hover:bg-brand-600/35 transition"
              >
                🛰️ Recapture GPS Lock
              </button>
            </div>

            {/* Address bar */}
            <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-xs flex gap-2 items-start">
              <MapPin className="w-4.5 h-4.5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-300">Resolved Coordinates Address</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">{address}</p>
                <p className="text-[9px] text-slate-500 mt-1 font-semibold">Lat: {coordinates[0].toFixed(5)} | Lng: {coordinates[1].toFixed(5)}</p>
              </div>
            </div>

            {/* Embed Leaflet Selector Map */}
            <div className="h-72 rounded-2xl overflow-hidden border border-white/10">
              <InteractiveMap
                issues={[]}
                mode="select"
                selectedCoordinates={coordinates}
                onCoordinateSelect={(coords, addr) => {
                  setCoordinates(coords);
                  setAddress(addr);
                }}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(2)}
                className="py-2.5 px-4 bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-glow-primary/10 transition flex items-center justify-center gap-1"
              >
                Proceed to Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Add Descriptions & Voice-to-Text */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="font-display font-bold text-sm text-slate-300">4. Incident details & Voice Dictation</h3>

            {/* Title */}
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">
                Incident Title (AI generated or customize)
              </label>
              <input
                type="text"
                placeholder="Pothole near street corner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Descriptions & Voice button */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Describe situation
                </label>
                <button
                  onClick={handleToggleVoice}
                  className={`px-3 py-1 rounded-lg border text-[9.5px] font-bold flex items-center gap-1.5 transition ${
                    isRecording 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? t('voicePlaceholder') : `Voice Dictate (${settings.language.toUpperCase()})`}
                </button>
              </div>
              <textarea
                rows={4}
                placeholder="Describe local impact, traffic blockage, safety hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(3)}
                className="py-2.5 px-4 bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-glow-primary/10 transition flex items-center justify-center gap-1"
              >
                Review Submission <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Final Review & Duplicate Warning */}
        {step === 5 && (
          <div className="space-y-5">
            <h3 className="font-display font-bold text-sm text-slate-300">5. Verify & Submit Report</h3>

            {/* Check for duplicates warnings */}
            {duplicateReport ? (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/35 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t('duplicateWarning')}</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      A similar incident was already reported nearby (approx {getDistanceMeters(coordinates[0], coordinates[1], duplicateReport.location.coordinates[0], duplicateReport.location.coordinates[1]).toFixed(0)}m away) by {duplicateReport.reportedByName}.
                    </p>
                  </div>
                </div>

                {/* Duplicate summary block */}
                <div className="p-3 bg-slate-900 border border-white/5 rounded-lg text-[11px] flex gap-3 items-center">
                  <img
                    src={duplicateReport.mediaUrls?.[0] || ''}
                    alt="Existing issue thumbnail"
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div>
                    <p className="font-bold text-slate-200">{duplicateReport.title}</p>
                    <p className="text-slate-500 text-[10px]">Status: {duplicateReport.status} | Reported: {new Date(duplicateReport.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold rounded-lg transition"
                  >
                    Go back, Verify instead
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-[10px] text-white font-extrabold rounded-lg transition shadow-md"
                  >
                    Submit anyway
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs flex gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-300">Zero Duplicates Flagged</p>
                  <p className="text-slate-400 leading-normal mt-0.5">
                    No active incident matching this category was detected within 100 meters. Report is ready for new logging.
                  </p>
                </div>
              </div>
            )}

            {/* Submission Abstract Summary */}
            <div className="p-4.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-3.5 text-xs text-slate-300">
              <div className="flex gap-4">
                <img
                  src={primaryImage}
                  alt="Documentation thumbnail"
                  className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{title || aiAnalysis?.subCategory}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Category: {category}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Severity: {aiAnalysis?.severity}</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-2.5 border-t border-white/5 text-[11px]">
                <p><span className="font-bold text-slate-400">Addressed Location:</span> {address}</p>
                <p><span className="font-bold text-slate-400">Description notes:</span> {description || 'N/A'}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(4)}
                className="py-2.5 px-4 bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              
              {!duplicateReport && (
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white text-xs font-bold rounded-xl shadow-glow-primary/10 transition flex items-center justify-center gap-1.5"
                >
                  File Incident and Dispatch <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default ReportIssue;
