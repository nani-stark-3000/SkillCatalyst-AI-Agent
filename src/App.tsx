/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  FileText, 
  Upload, 
  Send, 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  Clock, 
  ChevronRight,
  Loader2,
  BrainCircuit,
  Target,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const AI_MODEL = "gemini-3-flash-preview";

interface Skill {
  name: string;
  category: string;
  jdRequirement: string;
  resumeClaim: string;
  proficiency: 'unverified' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  justification?: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface LearningPlanItem {
  skill: string;
  resource: string;
  url: string;
  duration: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface SkillScore {
  skill: string;
  score: number;
  level: string;
  note: string;
}

interface AssessmentReport {
  overallScore: number;
  summary: string;
  skillScores: SkillScore[];
  learningPlan: LearningPlanItem[];
}

// --- Initialization ---

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'assessment' | 'plan'>('upload');
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [finalReport, setFinalReport] = useState<AssessmentReport | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Actions ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.text) {
        setResumeText(data.text);
      }
    } catch (error) {
      console.error('Failed to parse resume:', error);
      alert('Failed to parse resume. Please try pasting the text instead.');
    } finally {
      setIsUploading(false);
    }
  };

  const startAnalysis = async () => {
    if (!jdText || (!resumeText && !isUploading)) return;
    setStep('analyzing');

    try {
      // Step 1: Extract Skills from JD and Resume
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: `Extract skills from this Job Description and see what the Resume claims.
        
        JOB DESCRIPTION:
        ${jdText}
        
        RESUME:
        ${resumeText}
        
        Output as JSON array of objects with keys: name, category, jdRequirement, resumeClaim.
        Only include skills relevant to the JD.`,
        config: {
          temperature: 0.1,
          systemInstruction: "You are a deterministic, highly precise skill extraction and matching engine. Strictly rely only on the text provided.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                jdRequirement: { type: Type.STRING },
                resumeClaim: { type: Type.STRING }
              },
              required: ["name", "category", "jdRequirement", "resumeClaim"]
            }
          }
        }
      });

      const extractedSkills = JSON.parse(response.text || '[]').map((s: any) => ({
        ...s,
        proficiency: 'unverified'
      }));
      setSkills(extractedSkills);

      // Step 2: Start the assessment conversation
      const welcomeMsg = "I've analyzed the job description and your resume. I've identified several key skills to verify. Let's start with your experience in " + extractedSkills[0]?.name + ". Can you tell me about a complex project where you used this skill and the specific challenges you faced?";
      setMessages([{ role: 'model', content: welcomeMsg }]);
      setStep('assessment');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setStep('upload');
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiTyping) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          temperature: 0.1,
          systemInstruction: `You are a technical interviewer assessing proficiency. 
          Current unverified skills: ${skills.filter(s => s.proficiency === 'unverified').map(s => s.name).join(', ')}.
          
          Your Goal:
          1. Ask probing, conversational questions (not trivia) to assess real capability.
          2. After a thorough answer, mark the skill as beginner/intermediate/advanced/expert internally.
          3. When you have enough info for an unverified skill, move to the next one.
          4. If the user seems proficient enough, stop and tell them "I think we've covered the core skills. Would you like to see your personalized learning plan?".
          5. Use a professional, encouraging yet critical tone.`
        }
      });

      const aiText = response.text || "";
      setMessages(prev => [...prev, { role: 'model', content: aiText }]);

      // Check if AI wants to transition to plan
      if (aiText.toLowerCase().includes("learning plan")) {
        // We'll add a trigger button or auto-transition after a delay
      }
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const generatePlan = async () => {
    setStep('analyzing');
    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: `Based on our conversation and the skills I've extracted, generate a comprehensive assessment report and a personalized learning plan.
        
        JD: ${jdText}
        RESUME: ${resumeText}
        CONVERSATION: ${messages.map(m => m.content).join("\n")}
        
        Return a JSON object with:
        - overallScore: integer 0-100 indicating how well the candidate matches the JD overall. IMPORTANT: This MUST exactly be the mathematical average of the individual skillScores.
        - summary: A short clean summary of their fit.
        - skillScores: An array of skills assessed, give a score 0-100, level (Beginner/Intermediate/Advanced/Expert), and a brief note based strictly on the provided evidence.
        - learningPlan: A plan focusing on skills that are gaps or need improvement for the JD. Keys: skill, resource (title), url (suggest a real educational platform link like Coursera/Udemy), duration (e.g. 2 weeks), priority.`,
        config: {
          temperature: 0.0,
          systemInstruction: "You are a deterministic evaluator. Score systematically based strictly on explicit evidence from the text and conversation history. Calculate the overall score perfectly.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              skillScores: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    level: { type: Type.STRING },
                    note: { type: Type.STRING }
                  },
                  required: ["skill", "score", "level", "note"]
                }
              },
              learningPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    resource: { type: Type.STRING },
                    url: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                  },
                  required: ["skill", "resource", "url", "duration", "priority"]
                }
              }
            },
            required: ["overallScore", "summary", "skillScores", "learningPlan"]
          }
        }
      });

      setFinalReport(JSON.parse(response.text || '{}'));
      setStep('plan');
    } catch (error) {
      console.error('Plan generation failed:', error);
      setStep('assessment');
    }
  };

  // --- Sub-components ---

  const renderUpload = () => (
    <div className="max-w-4xl mx-auto space-y-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-6 pt-16">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.2em]">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          Catalyst AI | Professional Intelligence
        </div>
        <h1 className="text-6xl font-light tracking-tighter text-white sm:text-7xl">
          Claims are <span className="font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">static.</span> <br/>
          Skills are <span className="font-semibold text-white">dynamic.</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
          The autonomous assessment agent that probes beyond the PDF to verify real technical depth and bridge your career gaps.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[32px] flex flex-col h-full group hover:border-white/20 transition-all duration-500">
          <label className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-6 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3" />
              01/ Target Intelligence
            </div>
            <span className="text-slate-600">INPUT JD</span>
          </label>
          <textarea 
            placeholder="Paste the Job Description here..."
            className="flex-1 w-full p-6 rounded-2xl border border-white/5 focus:border-indigo-500/50 outline-none resize-none bg-black/20 text-slate-300 min-h-[300px] transition-all placeholder:text-slate-600 font-light leading-relaxed"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>

        <div className="glass p-8 rounded-[32px] flex flex-col h-full group hover:border-white/20 transition-all duration-500">
          <label className="flex items-center justify-between text-[10px] font-mono text-indigo-400 mb-6 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              02/ Identity Retrieval
            </div>
            <span className="text-slate-600">UPLOAD RESUME</span>
          </label>
          <div className="flex-1 flex flex-col gap-6">
            <div className="relative group/upload cursor-pointer h-40">
              <input 
                type="file" 
                accept=".pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileUpload}
              />
              <div className="h-full border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group-hover/upload:border-indigo-500/50 group-hover/upload:bg-indigo-500/5">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-600 group-hover/upload:text-indigo-400 transition-colors" />
                )}
                <p className="text-slate-400 font-medium text-sm">
                  {resumeText ? "Profile Ingested ✅" : "Drop PDF Professional Audit"}
                </p>
              </div>
            </div>
            
            <div className="relative h-full flex-grow">
               <textarea 
                placeholder="Or paste professional footprint here..."
                className="w-full h-full p-6 rounded-2xl border border-white/5 focus:border-indigo-500/50 outline-none resize-none bg-black/20 text-slate-300 min-h-[140px] transition-all placeholder:text-slate-600 font-light"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={startAnalysis}
          disabled={!jdText || !resumeText || isUploading}
          className="group relative px-12 py-5 bg-indigo-600 text-white rounded-full font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-30 glow-indigo"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
          <span className="relative flex items-center gap-3 tracking-widest uppercase text-xs">
            Initialize Assessment Protocol
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="fixed inset-0 bg-[#050508]/90 backdrop-blur-xl flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-8 p-12 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 animate-pulse rounded-full"></div>
          <div className="w-24 h-24 rounded-3xl border border-white/20 flex items-center justify-center relative bg-black/40 rotate-12 animate-spin-slow">
            <BrainCircuit className="w-10 h-10 text-cyan-400 -rotate-12" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-light text-white tracking-tight uppercase font-mono">Synthesizing Data</h2>
          <p className="text-slate-500 text-sm italic">Pattern matching requirements against candidate claims...</p>
        </div>
        <div className="w-64 bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
          />
        </div>
      </div>
    </div>
  );

  const renderAssessment = () => (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-[380px_1fr] gap-8 h-[calc(100vh-160px)] pt-4 overflow-hidden relative z-10">
      {/* Sidebar: Skills Matrix */}
      <div className="flex flex-col h-full glass rounded-[32px] p-8 overflow-hidden">
        <header className="mb-8 border-b border-white/5 pb-6">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em] mb-2">Real-time Matrix</div>
          <h3 className="text-xl font-medium text-white tracking-tight">Requirement Gap Analysis</h3>
        </header>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {skills.map((skill, i) => (
            <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1">{skill.category}</div>
                  <div className="text-base font-medium text-white group-hover:text-cyan-400 transition-colors">{skill.name}</div>
                </div>
                <div className={`p-1 rounded-full ${skill.proficiency === 'unverified' ? 'text-slate-700' : 'text-cyan-400'}`}>
                  {skill.proficiency === 'unverified' ? <Circle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 shadow-glow" />}
                </div>
              </div>
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Requirement Detail</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-light italic opacity-80">
                    "{skill.jdRequirement}"
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Candidate Claim</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-light italic border-l-2 border-indigo-500/30 pl-3">
                    {skill.resumeClaim || "None detected in resume metadata."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={generatePlan}
          className="mt-8 w-full bg-white/5 border border-white/10 text-slate-300 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase hover:bg-indigo-600 hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-3"
        >
          Finalize Assessment
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main: Chat Terminal */}
      <div className="flex flex-col h-full glass rounded-[32px] overflow-hidden border-white/5">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
              <Terminal className="text-white w-6 h-6 -rotate-3" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-widest uppercase">Protocol Catalyst.v1</div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Diagnostic Link Established</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 bg-white/5 px-4 py-2 rounded-lg">
            LATENCY: 14MS
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-black/10 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[80%] p-6 rounded-3xl text-sm leading-relaxed font-light
                  ${m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-900/20' 
                    : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none backdrop-blur-xl'}
                `}>
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-6 rounded-3xl rounded-tl-none border border-white/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-8 bg-black/20 border-t border-white/5">
          <div className="relative flex items-center gap-4 max-w-5xl mx-auto">
            <input 
              placeholder="System diagnosis active. Provide technical context..."
              className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-8 py-5 outline-none text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 transition-all font-light tracking-wide mr-16"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={isAiTyping || !chatInput.trim()}
              className="absolute right-3 bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-20 glow-indigo"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-4 px-2">
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
              Security Encrypted • end-to-end
            </div>
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
              press [enter] to transmit
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlan = () => {
    if (!finalReport) return null;

    return (
      <div className="max-w-6xl mx-auto py-20 space-y-16 animate-in fade-in zoom-in-95 duration-1000 relative z-10">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em]">
            <CheckCircle2 className="w-3 h-3 shadow-glow" />
            Intelligence Synthesis Complete
          </div>
          <h2 className="text-5xl font-light text-white tracking-tight">Professional <span className="font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Catalyst Roadmap</span></h2>
          
          <div className="flex justify-center my-12">
            <div className="bg-black/20 border border-white/5 p-10 rounded-full flex items-center justify-center relative shadow-[0_0_50px_rgba(34,211,238,0.1)]">
              <div className="absolute inset-0 border border-cyan-400/50 rounded-full animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(34,211,238,0.3)]"></div>
              <div className="text-center">
                <div className="text-7xl font-normal text-white">{finalReport.overallScore}<span className="text-4xl text-slate-500">%</span></div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em] mt-3">Overall Match</div>
              </div>
            </div>
          </div>

          <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
            {finalReport.summary}
          </p>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-light text-white tracking-tight border-b border-white/10 pb-4">Skill Assessment Match Scores</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {finalReport.skillScores.map((score, i) => (
              <div key={i} className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-cyan-400 transition-colors"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-medium text-white mb-1">{score.skill}</div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{score.level}</div>
                  </div>
                  <div className="text-3xl font-light text-white">
                    {score.score}<span className="text-base text-slate-500">%</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-light mt-4 pt-4 border-t border-white/5">
                  {score.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8 pt-8">
          <h3 className="text-2xl font-light text-white tracking-tight border-b border-white/10 pb-4">Personalized Learning Trajectory</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {finalReport.learningPlan.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative glass p-8 rounded-[32px] hover:border-indigo-500/30 transition-all duration-500 flex flex-col"
              >
                <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-2xl text-[9px] font-bold uppercase tracking-widest ${
                  item.priority === 'High' ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                  item.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {item.priority} Priority
                </div>
                
                <div className="flex-1 space-y-8 mt-4">
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Phase 0{i+1}</div>
                    <h4 className="text-2xl font-medium text-white group-hover:text-cyan-400 transition-colors tracking-tight">{item.skill}</h4>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Knowledge Resource</div>
                        <div className="text-sm font-medium text-slate-300 leading-tight">{item.resource}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Acquisition Velocity</div>
                        <div className="text-sm font-medium text-slate-300">{item.duration}</div>
                      </div>
                    </div>
                  </div>

                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:border-transparent transition-all group-hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] mt-auto"
                  >
                    Access Intelligence
                    <ChevronRight className="w-4 h-4 translate-x-1" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 pt-12">
          <div className="w-px h-20 bg-gradient-to-b from-transparent to-white/10"></div>
          <button 
            onClick={() => window.location.reload()}
            className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors flex items-center gap-4"
          >
            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
            Restart Diagnostic Protocol
            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg text-slate-200 selection:bg-cyan-500/30 selection:text-white font-sans p-6 md:p-12 relative overflow-x-hidden flex flex-col">
      {/* Immersive Orbital Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <header className="max-w-7xl w-full mx-auto flex items-center justify-between mb-20 relative z-20 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center rotate-6 group-hover:rotate-12 transition-all duration-500 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <BrainCircuit className="text-white w-8 h-8 relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-[-0.05em] text-white leading-none">SKILL CATALYST</span>
            <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-[0.5em] mt-1">Autonomous Intelligence</span>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center gap-12">
          <a href="#" className="text-[10px] font-mono text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors relative group">
            Knowledge Base
            <span className="absolute -bottom-2 left-0 w-0 h-px bg-cyan-400 transition-all group-hover:w-full"></span>
          </a>
          <a href="#" className="text-[10px] font-mono text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors relative group">
            Systems Ops
            <span className="absolute -bottom-2 left-0 w-0 h-px bg-cyan-400 transition-all group-hover:w-full"></span>
          </a>
          <div className="w-px h-8 bg-white/10"></div>
          <button className="text-[10px] font-mono text-cyan-400 border border-cyan-400/30 px-6 py-2.5 rounded-xl hover:bg-cyan-400 hover:text-black transition-all font-bold tracking-widest">
            AUTHENTICATE
          </button>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'upload' && renderUpload()}
          {step === 'analyzing' && renderAnalyzing()}
          {step === 'assessment' && renderAssessment()}
          {step === 'plan' && renderPlan()}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl w-full mx-auto mt-auto pt-12 border-t border-white/5 relative z-20 flex flex-col md:flex-row justify-between items-center gap-8 pb-4">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
             <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-1">Architecture v1.0.4</span>
             <span className="text-[10px] text-indigo-400 font-medium">Deccan AI Hackathon Prototype</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden md:block"></div>
          <div className="flex flex-col">
             <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-1">Engine</span>
             <span className="text-[10px] text-cyan-400 font-mono">Gemini-3-Flash-Preview</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.5em] text-center md:text-right">
          © 2026 SkillCatalyst Agent • All Systems Optimal
        </div>
      </footer>
    </div>
  );
}
