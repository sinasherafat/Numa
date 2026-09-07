"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Flag,
  Headphones,
  Home,
  Lightbulb,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Presentation,
  RotateCcw,
  RotateCw,
  Scale,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  Tag,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chapters, demoSources, demoTranscript, goalCopy, navItems, routeTitles, type Goal } from "@/lib/demo-data";

type AppState = {
  goal: Goal;
  duration: 5 | 10 | 20;
  level: "beginner" | "familiar" | "advanced";
  memory: boolean;
  adapted: boolean;
  familiar: boolean;
  baselineUpdated: boolean;
  sourceCAdded: boolean;
  explanation: string;
};

const initialState: AppState = {
  goal: "presentation",
  duration: 10,
  level: "familiar",
  memory: false,
  adapted: false,
  familiar: false,
  baselineUpdated: false,
  sourceCAdded: true,
  explanation: "Spacing practice can help later recall, but the result depends on how learning is tested.",
};

const iconByKey = {
  home: Home,
  library: BookOpen,
  topics: Tag,
  understanding: BarChart3,
};

function routeGroup(path: string) {
  if (path === "/") return "home";
  if (path.startsWith("/library") || path.startsWith("/listen") || path.startsWith("/sources") || path.startsWith("/explain") || path.startsWith("/outcome")) return "library";
  if (path.startsWith("/topics") || path.startsWith("/compare")) return "topics";
  if (path.startsWith("/understanding")) return "understanding";
  return "";
}

function useDemoState() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem("numa-demo-v1");
        if (saved) setState({ ...initialState, ...JSON.parse(saved) });
      } catch { /* storage is optional for the labeled sample workspace */ }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem("numa-demo-v1", JSON.stringify(state)); } catch { /* ignored */ }
  }, [ready, state]);
  return [state, setState] as const;
}

export function NumaApp({ initialPath }: { initialPath: string }) {
  const pathname = usePathname() || initialPath;
  const [state, setState] = useDemoState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = getScreen(pathname, state, setState);
  const activeGroup = routeGroup(pathname);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Primary navigation">
        <Link href="/" className="brand" aria-label="Numa home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Numa</span>
        </Link>
        <div className="workspace-label">Personal workspace</div>
        <Link href="/new" className="new-session"><Plus size={18}/><span>New session</span></Link>
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = iconByKey[item.key];
            return <Link key={item.key} href={item.href} className={`nav-link ${activeGroup === item.key ? "active" : ""}`}><Icon size={19}/><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings" className={`nav-link ${pathname === "/settings" ? "active" : ""}`}><Settings size={19}/><span>Settings</span></Link>
          <div className="profile"><span className="avatar">SS</span><span className="profile-name">Sina</span></div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button className="mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20}/></button>
            <span>{activeGroup ? activeGroup[0].toUpperCase() + activeGroup.slice(1) : "Workspace"}</span>
            <span>/</span>
            <strong>{routeTitles[pathname] ?? "Numa"}</strong>
          </div>
          <div className="top-actions">
            <span className="workspace-pill"><Sparkles size={15}/> Sample workspace <ChevronDown size={14}/></span>
            <button className="icon-btn" aria-label="Search"><Search size={20}/></button>
          </div>
        </header>
        {page}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" className={activeGroup === "home" ? "active" : ""}><Home size={19}/><span>Home</span></Link>
        <Link href="/library" className={activeGroup === "library" ? "active" : ""}><BookOpen size={19}/><span>Library</span></Link>
        <Link href="/new" aria-label="New session"><span className="mobile-new"><Plus size={22}/></span><span>New</span></Link>
        <Link href="/topics/spaced-practice/changes" className={activeGroup === "topics" ? "active" : ""}><Tag size={19}/><span>Topics</span></Link>
        <Link href="/understanding" className={activeGroup === "understanding" ? "active" : ""}><BarChart3 size={19}/><span>Understanding</span></Link>
      </nav>
    </div>
  );
}

function getScreen(path: string, state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>) {
  if (path === "/new" || path === "/sources") return <NewSession state={state} setState={setState}/>;
  if (path === "/plan") return <Plan state={state}/>;
  if (path === "/listen" || path === "/listen/ask") return <Player state={state} setState={setState} initialAsk={path.endsWith("ask")}/>;
  if (path === "/sources/study-a/page/4") return <SourceReader/>;
  if (path === "/explain") return <Explain state={state} setState={setState}/>;
  if (path === "/explain/feedback") return <Feedback state={state} setState={setState}/>;
  if (path === "/compare") return <Compare/>;
  if (path === "/topics/spaced-practice/changes") return <Changes state={state} setState={setState}/>;
  if (path === "/understanding") return <Understanding state={state} setState={setState}/>;
  if (path === "/outcome") return <Outcome state={state}/>;
  if (path === "/library") return <LibraryPage/>;
  if (path === "/settings") return <SettingsPage state={state} setState={setState}/>;
  return <HomePage/>;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p className="subtitle">{subtitle}</p>}</div>{action}</div>;
}

function DemoLabel() {
  return <span className="badge purple"><Sparkles size={12}/> Illustrative demo data</span>;
}

function HomePage() {
  return <div className="page narrow home-page">
    <PageHeading title="Good morning, Sina." subtitle="Pick up where you left off, or begin with a source." action={<Link href="/new" className="button primary"><Plus size={18}/> Start a session</Link>}/>
    <DemoLabel/>
    <div className="grid two home-grid">
      <section className="card continue-card">
        <div className="row between"><span className="badge">Continue listening</span><span className="fine">Saved at 03:24</span></div>
        <div className="continue-content"><div className="cover"><Headphones size={30}/></div><div><h2>Spaced practice & recall</h2><p className="muted">Prepare a presentation · 2 sources · 10 min</p><div className="mini-progress"><span/></div></div></div>
        <Link href="/listen" className="button primary"><Play size={17} fill="currentColor"/> Resume chapter 2</Link>
      </section>
      <section className="card">
        <h2>Ready for review</h2>
        <div className="list-row"><div className="round-icon purple"><Tag size={18}/></div><div><strong>Spaced practice</strong><p className="fine">1 new source · changes are ready</p></div><Link href="/topics/spaced-practice/changes" className="button compact">Review</Link></div>
        <div className="divider"/>
        <div className="list-row"><div className="round-icon green"><Flag size={18}/></div><div><strong>Presentation outline</strong><p className="fine">Draft · 6 sections</p></div><Link href="/outcome" className="button compact">Open</Link></div>
      </section>
    </div>
    <section className="section-stack recent"><div className="row between"><h2>Recent learning</h2><Link href="/library" className="text-link">View library <ArrowRight size={15}/></Link></div>
      <div className="grid three">
        {["Why the interval matters","Comparing study conditions","The limits of transfer"].map((title, i) => <Link href={i === 0 ? "/listen" : "/compare"} className="card learning-card" key={title}><span className="eyebrow">{i === 1 ? "Comparison" : "Chapter"}</span><h3>{title}</h3><p className="fine">Source-grounded · {i + 1} evidence notes</p></Link>)}
      </div>
    </section>
  </div>;
}

function GoalIcon({ goal }: { goal: Goal }) {
  if (goal === "presentation") return <Presentation size={27}/>;
  if (goal === "compare") return <Scale size={27}/>;
  return <BookOpen size={27}/>;
}

function NewSession({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const router = useRouter();
  const [fileReady, setFileReady] = useState(true);
  return <div className="page new-page">
    <PageHeading title="What would you like to understand?" subtitle="Start with a source. Leave with something you can explain."/>
    <DemoLabel/>
    <div className="goal-grid">
      {(Object.keys(goalCopy) as Goal[]).map((goal) => <button key={goal} className={`goal-card ${state.goal === goal ? "active" : ""}`} onClick={() => setState(s => ({ ...s, goal }))}><GoalIcon goal={goal}/><div><strong>{goalCopy[goal].label}</strong><span>{goalCopy[goal].description}</span></div></button>)}
    </div>
    <div className="grid two session-grid">
      <section className="card">
        <h2>Your sources</h2>
        <label className="upload-zone"><input type="file" accept="application/pdf" onChange={() => setFileReady(true)}/><Upload size={26}/><strong>Drop a PDF or choose a file</strong><span>Text-based PDF · up to 20 MB</span><em>Demo uploads stay in your browser and are not processed.</em></label>
        {fileReady && <div className="source-file"><FileText size={24}/><div><strong>Learning intervals.pdf</strong><span>12 pages · Demo source</span></div><span className="ready"><CheckCircle2 size={15}/> Ready</span><MoreHorizontal size={18}/></div>}
        <div className="divider"/>
        <h2>Make it yours</h2>
        <div className="field"><label htmlFor="question">What is your {state.goal === "presentation" ? "presentation" : "learning session"} about?</label><input id="question" className="input" defaultValue="Explain how spaced practice affects recall"/></div>
        <div className="grid equal compact-grid">
          <div className="field"><label htmlFor="audience">Audience</label><select id="audience" className="select" defaultValue="graduate"><option value="graduate">Graduate seminar</option><option value="team">Work team</option><option value="self">Just me</option></select></div>
          <div className="field"><label htmlFor="level">Your familiarity</label><select id="level" className="select" value={state.level} onChange={e => setState(s => ({...s, level: e.target.value as AppState["level"]}))}><option value="beginner">Beginner</option><option value="familiar">Familiar</option><option value="advanced">Advanced</option></select></div>
        </div>
        <div className="field"><label>Duration</label><div className="segmented">{([5,10,20] as const).map(d => <button key={d} className={`segment ${state.duration === d ? "active" : ""}`} onClick={() => setState(s => ({...s,duration:d}))}>{d} min</button>)}</div></div>
        <div className="row form-actions"><button className="button primary" onClick={() => router.push("/plan")}>Review plan <ArrowRight size={17}/></button><button className="button" onClick={() => router.push("/library")}>Save draft</button></div>
      </section>
      <div className="section-stack">
        <section className="card plan-preview">
          <div className="row between"><h2>Your learning plan</h2><span className="badge purple">{goalCopy[state.goal].label}</span></div>
          <ol className="number-list">{goalCopy[state.goal].plan.map((item,i)=><li key={item}><span>{i+1}</span><div><strong>{item}</strong><p>{["Clarify the question and why it matters.","Cover how the research was done and what it shows.","Consider what the study can and cannot tell us.","Turn key points into a clear, natural explanation."][i]}</p></div></li>)}</ol>
          <div className="divider"/><h3>You’ll leave with</h3>
          {["A clear spoken explanation", state.goal === "presentation" ? "A presentation outline" : "Editable source notes", "Questions to prepare for"].map(x => <div className="check-line" key={x}><Check size={14}/><span>{x}</span></div>)}
        </section>
        <section className="card memory-card"><div><h3>Learning memory</h3><p className="fine">Remember concepts across sessions only with your permission.</p></div><button className={`switch ${state.memory ? "on" : ""}`} role="switch" aria-checked={state.memory} aria-label="Learning memory" onClick={() => setState(s => ({...s,memory:!s.memory}))}/><span className="fine">{state.memory ? "On" : "Off"}</span></section>
      </div>
    </div>
  </div>;
}

function Plan({ state }: { state: AppState }) {
  return <div className="page narrow">
    <PageHeading title="Your learning path is ready to review." subtitle="Everything below is editable before Numa creates audio."/>
    <DemoLabel/>
    <div className="grid two">
      <section className="card"><div className="row between"><div><span className="eyebrow">Goal</span><h2>{goalCopy[state.goal].label}</h2></div><Link href="/new" className="button compact"><Pencil size={14}/> Edit</Link></div><p className="muted">Explain how spaced practice affects recall for a graduate seminar.</p><div className="source-file"><FileText size={23}/><div><strong>Learning intervals.pdf</strong><span>Pages 1–12 selected</span></div><CheckCircle2 size={17} className="success"/></div><div className="source-file"><FileText size={23}/><div><strong>Recall over time.pdf</strong><span>Pages 1–9 selected</span></div><CheckCircle2 size={17} className="success"/></div></section>
      <section className="card"><h2>Plan details</h2><div className="detail-row"><span>Familiarity</span><strong>{state.level}</strong></div><div className="detail-row"><span>Target duration</span><strong>{state.duration} min</strong></div><div className="detail-row"><span>Language</span><strong>English</strong></div><div className="detail-row"><span>Learning memory</span><strong>{state.memory ? "On" : "Off"}</strong></div><div className="notice"><strong>Sample workspace</strong><br/>Audio, citations and feedback use a consistent illustrative fixture. Private document processing is shown separately when providers are configured.</div></section>
    </div>
    <section className="card chapter-plan"><h2>Proposed chapters</h2>{chapters.map(c => <div className="chapter-row" key={c.n}><span>{c.n}</span><div><strong>{c.title}</strong><p className="fine">Grounded in selected source pages</p></div><span>{c.duration}</span></div>)}</section>
    <div className="row"><Link href="/listen" className="button primary"><Sparkles size={17}/> Open sample audio</Link><Link href="/new" className="button">Edit inputs</Link></div>
  </div>;
}

function Player({ state, setState, initialAsk }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; initialAsk: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(18);
  const [askOpen, setAskOpen] = useState(initialAsk);
  const [question, setQuestion] = useState("What’s the difference between performance and learning?");
  const [answered, setAnswered] = useState(initialAsk);
  const [follow, setFollow] = useState(true);
  const currentLine = useMemo(() => demoTranscript.find(line => time >= line.start && time < line.end)?.id ?? "t6", [time]);
  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { await audio.play(); setPlaying(true); } else { audio.pause(); setPlaying(false); }
  }, []);
  const seek = (delta: number) => { if (audioRef.current) { audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 45, audioRef.current.currentTime + delta)); setTime(audioRef.current.currentTime); } };
  const submit = () => { if (question.trim()) setAnswered(true); };
  const acceptAdaptation = () => { setState(s => ({...s,adapted:true})); setAskOpen(false); };
  return <div className={`player-layout ${askOpen ? "with-panel" : ""}`}>
    <div className="page player-main">
      <PageHeading title="Spaced practice & recall" subtitle="Prepare a presentation · 2 demo sources · 10 min"/>
      <DemoLabel/>
      <div className="tabs"><button className="tab active">Listen</button><Link className="tab" href="/sources/study-a/page/4">Sources</Link><Link className="tab" href="/outcome">Outcome</Link></div>
      <section className="card audio-card">
        <span className="eyebrow">Chapter 2 of 4</span><div className="row between audio-title"><h2>Why the interval matters</h2>{state.adapted && <span className="badge purple"><Sparkles size={12}/> Updated path</span>}</div>
        <audio ref={audioRef} src="/audio/spaced-practice-demo.wav" preload="metadata" onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onEnded={() => setPlaying(false)}/>
        <div className="progress-track"><span style={{width:`${Math.min(100,(time/45)*100)}%`}}/><i style={{left:`${Math.min(100,(time/45)*100)}%`}}/></div><div className="row between time-row"><span>{formatTime(time)}</span><span>00:45</span></div>
        <div className="player-controls"><button className="icon-btn" onClick={() => seek(-15)} aria-label="Back 15 seconds"><RotateCcw size={22}/><small>15</small></button><button className="play-button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button className="icon-btn" onClick={() => seek(15)} aria-label="Forward 15 seconds"><RotateCw size={22}/><small>15</small></button><select aria-label="Playback speed" defaultValue="1" className="speed" onChange={e => { if (audioRef.current) audioRef.current.playbackRate = Number(e.target.value || 1); }}><option value="0.75">.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><a href="/audio/spaced-practice-demo.wav" download className="icon-btn" aria-label="Download complete demo revision"><Download size={20}/></a></div>
        <div className="player-actions"><button className="button" onClick={() => {setAskOpen(true);setAnswered(false)}}><MessageCircle size={18}/> Ask</button><button className="button primary" onClick={() => {setAskOpen(true);setAnswered(true)}}><Lightbulb size={18}/> Explain this</button><button className={`button ${state.familiar ? "soft" : ""}`} onClick={() => setState(s => ({...s,familiar:!s.familiar}))}><CheckCircle2 size={18}/> {state.familiar ? "Marked familiar" : "I know this"}</button></div>
      </section>
      <section className="card transcript-card"><div className="row between"><h2>Transcript</h2><div className="row"><span className="fine">Follow audio</span><button className={`switch ${follow ? "on" : ""}`} role="switch" aria-checked={follow} onClick={() => setFollow(!follow)} aria-label="Follow audio"/></div></div>
        <div className="transcript-list">{demoTranscript.map(line => <div className={`transcript-line ${currentLine === line.id ? "active" : ""}`} key={line.id}><span className={`speaker speaker-${line.speaker.toLowerCase()}`}>{line.speaker}</span><button className="transcript-text" onClick={() => {if(audioRef.current){audioRef.current.currentTime=line.start;setTime(line.start)}}}>{line.text}</button><time>{formatTime(line.start)}</time><Link href="/sources/study-a/page/4" className="source-chip">{line.source}</Link></div>)}</div>
      </section>
      <section className="card next-card"><h3>Next chapters</h3>{chapters.slice(2).map((c,i) => <div className="chapter-row" key={c.n}><span>{c.n}</span><div><strong>{state.adapted && i === 0 ? "A clearer performance vs. learning example" : c.title}</strong></div><span>{c.duration}</span><button className="icon-btn compact" aria-label={`Play ${c.title}`}><Play size={15} fill="currentColor"/></button></div>)}</section>
    </div>
    {askOpen && <aside className="ask-panel" aria-label="Explain this panel"><div className="row between"><div><h2>Explain this</h2><p className="muted">Paused at {formatTime(time)}</p></div><button className="icon-btn" onClick={() => setAskOpen(false)} aria-label="Close panel"><X size={20}/></button></div>
      <div className="conversation"><div className="message user"><span className="avatar small-avatar">SS</span><p>{question}</p></div>{answered && <div className="message assistant"><span className="assistant-avatar"><Sparkles size={17}/></span><div><p>Performance is what you can do now. Later recall shows whether that performance lasts after a delay.</p><Link href="/sources/study-a/page/4" className="source-chip"><FileText size={15}/> Study A · p. 4 <ExternalLink size={13}/></Link></div></div>}</div>
      {answered && <div className="adapt-card"><Lightbulb size={22}/><div><h3>Make the next part clearer</h3><p className="muted">Add a short seminar example before the next chapter. The current chapter and everything already heard stay unchanged.</p><div className="row wrap"><button className="button primary" onClick={acceptAdaptation}>Update next chapters</button><button className="button" onClick={() => setAskOpen(false)}>Just answer</button></div></div></div>}
      <div className="panel-spacer"/>{answered && <div className="saved-note"><CheckCircle2 size={18}/> Your listening position is saved.</div>}
      <div className="composer"><textarea aria-label="Ask a follow-up" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a follow-up…"/><button onClick={submit} aria-label="Send question"><Send size={18}/></button></div>
    </aside>}
  </div>;
}

function formatTime(time: number) { const t = Number.isFinite(time) ? Math.max(0, time) : 0; return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`; }

function SourceReader() {
  return <div className="page narrow source-reader"><div className="row between source-toolbar"><Link href="/listen" className="button"><ArrowLeft size={17}/> Back to listening</Link><span className="badge">Study A · Version 1</span></div><section className="paper"><div className="paper-meta"><span>Learning intervals and delayed recall</span><span>Page 4 of 12</span></div><h1>Performance during practice and later learning</h1><p>Immediate performance can improve during repeated practice without producing the same advantage on a delayed test. The interval between practice episodes and the timing of the final test therefore need to be reported separately.</p><p className="highlight">When the goal is durable recall, spacing may reduce fluency during practice while improving what remains available later.</p><p>The study used a shorter test interval than the comparison source. This difference limits direct comparison and should not be treated as a contradiction by itself.</p><div className="paper-citation">Illustrative source fixture · Study A · physical PDF page 4 · section “Results”</div></section></div>;
}

function Explain({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const router = useRouter(); const [recording,setRecording]=useState(false); const [permission,setPermission]=useState("");
  const record = async () => { if (recording) {setRecording(false);return;} try { const stream=await navigator.mediaDevices.getUserMedia({audio:true}); stream.getTracks().forEach(t=>t.stop()); setRecording(true); setPermission("Microphone ready. Demo audio is not uploaded; confirm the editable transcript below."); } catch { setPermission("Microphone access is off. You can type your explanation."); } };
  return <div className="page narrow"><PageHeading title="Explain it back" subtitle="Use your own words. Numa checks the idea against the selected sources, not your speaking style."/><DemoLabel/><div className="grid two"><section className="card"><span className="eyebrow">Your prompt</span><h2>Explain the main finding and one limitation.</h2><p className="muted">You can speak for 30–120 seconds or type instead.</p><button className={`record-button ${recording ? "recording" : ""}`} onClick={record}>{recording ? <Square fill="currentColor"/> : <Mic/>}<span>{recording ? "Stop recording" : "Record explanation"}</span></button>{permission && <div className="notice">{permission}</div>}<div className="or"><span>or type</span></div><div className="field"><label htmlFor="explanation">Editable transcript</label><textarea id="explanation" className="textarea" value={state.explanation} onChange={e=>setState(s=>({...s,explanation:e.target.value}))}/></div><div className="row"><button className="button primary" disabled={!state.explanation.trim()} onClick={()=>router.push("/explain/feedback")}>Submit explanation <ArrowRight size={17}/></button><Link href="/listen" className="button">Keep listening</Link></div></section><section className="card"><h2>What Numa will check</h2>{["Separates immediate performance from later recall","Names the test interval as a condition","Avoids claiming transfer to unfamiliar tasks"].map((x,i)=><div className="criteria" key={x}><span>{i+1}</span><div><strong>{x}</strong><p className="fine">Compared with Study A and Study B.</p></div></div>)}<div className="notice warning"><strong>Assessment boundary</strong><br/>If the transcript is too short or the sources do not support the claim, Numa returns Cannot assess rather than a made-up score.</div></section></div></div>;
}

function Feedback({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  return <div className="page feedback-page"><PageHeading title="You explained the key idea." subtitle="Let’s make the limits just as clear."/><DemoLabel/><div className="grid two"><div className="section-stack"><section className="card"><h2>Your explanation</h2><div className="explanation-player"><button className="play-button small" aria-label="Play explanation"><Play fill="currentColor"/></button><span>01:08</span><div className="thin-progress"><span/></div><Volume2 size={18}/><MoreHorizontal size={18}/></div><blockquote>“{state.explanation}”</blockquote><Link className="text-link" href="/explain"><Pencil size={15}/> Edit transcript</Link></section><section className="card"><h2>Feedback on your explanation</h2><FeedbackItem kind="success" title="Accurate" body="You separated immediate performance from later recall." source="Study A · p. 4"/><FeedbackItem kind="warning" title="Add this limitation" body="The result may not apply to every task or test interval." source="Study B · p. 7"/><FeedbackItem kind="neutral" title="Try explaining" body="Why might two studies report different outcomes?"/></section><div className="row"><button className="button primary">Make a 2-minute review</button><Link href="/outcome" className="button">Continue to outline</Link></div></div><div className="section-stack"><section className="card understanding-panel"><div className="row between"><h2>My Understanding</h2><div className="row"><button className={`switch ${state.memory ? "on" : ""}`} role="switch" aria-checked={state.memory} aria-label="Learning memory" onClick={()=>setState(s=>({...s,memory:!s.memory}))}/><strong className="small">Memory {state.memory ? "ON" : "OFF"}</strong></div></div><p className="fine">{state.memory ? "Saved with your permission" : "Session-only until you turn memory on"}</p><ConceptRow title="Spaced practice" body="Reviewing information over time." badge="Explained in this session" tone="green"/><ConceptRow title="Test interval" body="The delay between learning and being tested." badge="Needs another look" tone="amber"/><ConceptRow title="Transfer to new tasks" body="Applying what you learned in different contexts." badge="Not assessed" tone="dark"/><div className="row wrap concept-actions"><Link href="/understanding" className="text-link"><Pencil size={15}/> Edit memory</Link><button className="text-link" onClick={()=>setState(s=>({...s,memory:false}))}><Trash2 size={15}/> Forget this session</button></div></section><section className="card next-step"><Flag size={26}/><div><h3>Your next step</h3><p className="muted">Practise one limitation, then return to your presentation.</p></div></section></div></div></div>;
}

function FeedbackItem({kind,title,body,source}:{kind:"success"|"warning"|"neutral";title:string;body:string;source?:string}) { return <div className="feedback-item"><span className={`feedback-icon ${kind}`}>{kind==="success"?<Check size={18}/>:kind==="warning"?<AlertCircle size={18}/>:<CircleHelp size={18}/>}</span><div><strong>{title}</strong><p>{body}</p></div>{source&&<Link href="/sources/study-a/page/4" className="source-link"><FileText size={15}/>{source}</Link>}</div>; }
function ConceptRow({title,body,badge,tone}:{title:string;body:string;badge:string;tone:string}) { return <div className="concept-row"><div className="row between"><strong>{title}</strong><span className={`badge ${tone}`}>{badge}</span></div><p>{body}</p><Link href="/sources/study-a/page/4" className="text-link"><FileText size={14}/> View evidence <ChevronRight size={14}/></Link></div>; }

function Compare() {
  return <div className="page compare-page"><PageHeading title="Where do the sources agree?" subtitle="Compare claims, context and what remains uncertain." action={<button className="button primary"><Play size={16} fill="currentColor"/> Listen to comparison</button>}/><DemoLabel/><div className="source-strip">{demoSources.slice(0,2).map(s=><div className="source-card" key={s.id}><FileText size={22}/><div><strong>{s.title}</strong><span>{s.pages} pages</span></div><MoreHorizontal size={18}/></div>)}<button className="source-card add"><Plus/><span>Add source</span></button></div><section className="card question-card"><span className="eyebrow">Your question</span><h2>When does spaced practice improve later recall?</h2></section><section className="card flush comparison-table"><div className="comparison-row header"><strong>Question</strong><strong>Study A</strong><strong>Study B</strong><strong>What it means</strong></div><ComparisonRow label="Later recall" a="Benefit reported" b="Benefit reported" result="Agreement" tone="green"/><ComparisonRow label="Test timing" a="Shorter interval" b="Longer interval" result="Different conditions" tone="amber"/><ComparisonRow label="New tasks" a="Not examined" b="Not examined" result="Still unknown" tone="dark"/></section><div className="grid equal compare-notes"><section className="card note-card"><FileText size={23}/><div><h3>Why the difference matters</h3><p className="muted">Different test intervals do not automatically mean the findings conflict.</p><span className="badge purple">Interpretation</span></div><Link href="/sources/study-a/page/4" className="text-link">View supporting passages <ArrowRight size={15}/></Link></section><section className="card note-card"><CircleHelp size={23}/><div><h3>Still unknown</h3><p className="muted">Do these findings transfer to unfamiliar tasks?</p><button className="text-link">Add evidence</button></div></section></div><section className="card comparison-audio"><button className="play-button small" aria-label="Play explanation"><Play fill="currentColor"/></button><div><strong>Comparison overview</strong><p className="fine">Ready to listen · 06:12</p></div><Volume2 size={18}/><div className="thin-progress"><span/></div><MoreHorizontal size={18}/></section></div>;
}
function ComparisonRow({label,a,b,result,tone}:{label:string;a:string;b:string;result:string;tone:string}) { return <div className="comparison-row"><strong>{label}</strong><div>{a}<span>[A · p. 4]</span></div><div>{b}<span>[B · p. 6]</span></div><div><span className={`badge ${tone}`}>{result}</span></div></div>; }

function Changes({state,setState}:{state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>}) {
  return <div className="page changes-page"><PageHeading title="What’s changed since your last review?" subtitle="A focused update, grounded in your previous sources." action={<button className="button"><Plus size={17}/> Add source</button>}/><DemoLabel/><section className="card baseline-summary"><div><span className="eyebrow">Previous review</span><strong>September 2 · 2 sources</strong></div><div><span className="eyebrow">New material</span><strong>1 source added · September 6</strong></div></section><div className="grid two changes-grid"><div><h2>Changes worth your attention</h2><div className="change-stack"><ChangeCard tone="purple" badge="Added context" title="A longer recall interval" body="The new source tests recall after a different delay." sources={<><Link href="/sources/study-a/page/4">Previous: Study B · p. 6</Link><Link href="/sources/study-a/page/4">New: Study C · p. 3</Link></>}/><ChangeCard tone="amber" badge="Needs a closer look" title="The result may depend on the task" body="Different task conditions limit direct comparison." sources={<Link href="/sources/study-a/page/4">Study C · p. 5</Link>}/><ChangeCard tone="gray" badge="Unchanged" title="Transfer is still an open question" body="The added source does not resolve this gap." sources={<Link href="/compare">View evidence</Link>}/></div></div><div className="section-stack"><section className="card update-card"><span className="eyebrow">Your update</span><div className="row between"><h2>Only what’s new</h2><strong>04:20</strong></div><div className="waveform">{Array.from({length:46},(_,i)=><i key={i} style={{height:`${10+(i%7)*3}px`}}/>)}</div><button className="button primary block"><Play size={16} fill="currentColor"/> Listen to update</button><div className="divider"/><h3>Your review baseline</h3><strong>{state.baselineUpdated ? "September 6 review" : "September 2 review"}</strong><p className="fine">It stays the same until you explicitly mark this update reviewed.</p><button className="button primary block" onClick={()=>setState(s=>({...s,baselineUpdated:true}))}>{state.baselineUpdated?<><Check size={17}/> Update reviewed</>:"Mark update reviewed"}</button><button className="text-link centered" onClick={()=>setState(s=>({...s,baselineUpdated:false}))}>Keep previous baseline</button></section><section className="card"><span className="eyebrow">Source information</span><div className="row source-info"><FileText/><div><h3>Study C</h3><p className="fine">Published: August 18<br/>Added: September 6</p></div></div></section></div></div></div>;
}
function ChangeCard({tone,badge,title,body,sources}:{tone:string;badge:string;title:string;body:string;sources:React.ReactNode}) { return <section className={`card change-card ${tone}`}><span className={`badge ${tone==="purple"?"purple":tone==="amber"?"amber":"dark"}`}>{badge}</span><h2>{title}</h2><p className="muted">{body}</p><div className="row wrap source-links"><FileText size={16}/>{sources}</div></section>; }

function Understanding({state,setState}:{state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>}) {
  const [forgotten,setForgotten]=useState<string[]>([]); const forget=(x:string)=>setForgotten(v=>[...v,x]);
  const concepts=[{name:"Spaced practice",kind:"Explain-back evidence",status:"Explained accurately",tone:"green",detail:"You separated immediate performance from later recall."},{name:"Test interval",kind:"Unresolved gap",status:"Needs another look",tone:"amber",detail:"The test delay changes what the result can support."},{name:"Transfer to new tasks",kind:"Not assessed",status:"Not assessed",tone:"dark",detail:"The selected sources do not test unfamiliar tasks."},{name:"Performance",kind:"Self-report",status:state.familiar?"You marked this familiar":"Encountered",tone:"purple",detail:"Session evidence and self-report remain distinct."}];
  return <div className="page narrow understanding-page"><PageHeading title="My Understanding" subtitle="Inspect what you encountered, explained, and still want to clarify."/><DemoLabel/><section className="card consent-banner"><div><h2>Learning memory</h2><p className="muted">Cross-session memory is {state.memory?"enabled with your permission":"off. Session context stays in this session"}.</p></div><button className={`switch ${state.memory?"on":""}`} role="switch" aria-checked={state.memory} aria-label="Learning memory" onClick={()=>setState(s=>({...s,memory:!s.memory}))}/><strong>{state.memory?"On":"Off"}</strong></section><div className="filter-row"><button className="button compact soft">All evidence</button><button className="button compact">Gaps</button><button className="button compact">Self-reported</button></div><div className="concept-grid">{concepts.filter(c=>!forgotten.includes(c.name)).map(c=><section className="card concept-card" key={c.name}><div className="row between"><span className="eyebrow">{c.kind}</span><span className={`badge ${c.tone}`}>{c.status}</span></div><h2>{c.name}</h2><p className="muted">{c.detail}</p><div className="row between"><Link href="/sources/study-a/page/4" className="text-link"><FileText size={15}/> View evidence</Link><div className="row"><button className="icon-btn compact" aria-label={`Edit ${c.name}`}><Pencil size={16}/></button><button className="icon-btn compact" aria-label={`Forget ${c.name}`} onClick={()=>forget(c.name)}><Trash2 size={16}/></button></div></div></section>)}</div>{forgotten.length>0&&<div className="notice">Removed from demo personalization immediately. <button className="text-link" onClick={()=>setForgotten([])}>Undo</button></div>}</div>;
}

function Outcome({state}:{state:AppState}) {
  const [tab,setTab]=useState<"outline"|"notes"|"cards">("outline"); const [notes,setNotes]=useState("Spacing can improve later recall, but test timing and task conditions limit what we can conclude.");
  const download = () => { const text=`# Spaced practice & recall\n\nGoal: ${goalCopy[state.goal].label}\nDate: 2026-09-07\nSources: Study A v1; Study B v1\n\n${notes}\n\n## Sources\n- Study A, p. 4\n- Study B, pp. 6–7`; const url=URL.createObjectURL(new Blob([text],{type:"text/markdown"})); const a=document.createElement("a");a.href=url;a.download="numa-spaced-practice-outcome.md";a.click();URL.revokeObjectURL(url); };
  return <div className="page narrow outcome-page"><PageHeading title="Your presentation outcome" subtitle="An editable, source-grounded draft from this session revision." action={<button className="button" onClick={download}><FileDown size={17}/> Export Markdown</button>}/><DemoLabel/><div className="tabs"><button className={`tab ${tab==="outline"?"active":""}`} onClick={()=>setTab("outline")}>Slide outline</button><button className={`tab ${tab==="notes"?"active":""}`} onClick={()=>setTab("notes")}>Notes</button><button className={`tab ${tab==="cards"?"active":""}`} onClick={()=>setTab("cards")}>Flashcards</button></div>{tab==="outline"&&<div className="grid two"><section className="card slide-list">{["Why spacing feels harder","Performance is not learning","What the studies found","Why intervals matter","Limits and open questions","Takeaway"].map((x,i)=><div className="slide-row" key={x}><span>{i+1}</span><div><strong>{x}</strong><p className="fine">Speaker note with source citation · {i<3?"Study A · p. 4":"Study B · p. 7"}</p></div><Pencil size={15}/></div>)}</section><section className="card"><h2>Practice questions</h2>{["How is later recall different from immediate performance?","Could the result depend on the test interval?","Do the findings transfer to new tasks?"].map((q,i)=><div className="practice-q" key={q}><span>{i+1}</span><p>{q}</p><button className="button compact">Practice</button></div>)}</section></div>}{tab==="notes"&&<section className="card"><div className="field"><label htmlFor="notes">Editable notes</label><textarea id="notes" className="textarea tall" value={notes} onChange={e=>setNotes(e.target.value)}/></div><div className="source-chip"><FileText size={15}/> Study A · p. 4; Study B · pp. 6–7</div></section>}{tab==="cards"&&<div className="grid equal">{[["What is immediate performance?","What you can do during or directly after practice."],["What does later recall show?","Whether performance remains after a delay."],["What stays unknown?","Transfer to unfamiliar tasks was not examined."]].map(([q,a])=><section className="card flashcard" key={q}><span className="eyebrow">Question</span><h2>{q}</h2><div className="divider"/><span className="eyebrow">Answer</span><p>{a}</p><Link href="/sources/study-a/page/4" className="text-link">View source</Link></section>)}</div>}</div>;
}

function LibraryPage() {
  return <div className="page narrow"><PageHeading title="Library" subtitle="Your sessions, sources and listening queue." action={<Link href="/new" className="button primary"><Plus size={17}/> New session</Link>}/><div className="tabs"><button className="tab active">Sessions</button><button className="tab">Sources</button><button className="tab">Downloads</button></div><div className="grid two"><section className="card library-session"><div className="row between"><span className="badge purple">In progress</span><MoreHorizontal size={18}/></div><h2>Spaced practice & recall</h2><p className="muted">Prepare a presentation · 2 sources</p><div className="mini-progress"><span/></div><div className="row between"><span className="fine">Chapter 2 · saved at 03:24</span><Link href="/listen" className="button compact primary">Resume</Link></div></section><section className="card library-session"><div className="row between"><span className="badge green">Outcome ready</span><MoreHorizontal size={18}/></div><h2>Where the sources agree</h2><p className="muted">Compare evidence · 2 sources</p><div className="row between"><span className="fine">Complete revision · 06:12</span><Link href="/compare" className="button compact">Open</Link></div></section></div><h2 className="queue-title">Listening queue</h2><section className="card flush"><div className="chapter-row"><span>01</span><div><strong>Why the interval matters</strong><p className="fine">Spaced practice & recall</p></div><span>03:24</span><Play size={16}/></div><div className="chapter-row"><span>02</span><div><strong>Comparison overview</strong><p className="fine">Where the sources agree</p></div><span>06:12</span><Play size={16}/></div></section></div>;
}

function SettingsPage({state,setState}:{state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>}) {
  const [deleted,setDeleted]=useState(false);
  return <div className="page narrow settings-page"><PageHeading title="Settings" subtitle="Control memory, recordings, downloads and your data."/><div className="section-stack"><section className="card settings-section"><div><h2>Learning memory</h2><p className="muted">Use permitted evidence across sessions. This is separate from session history.</p></div><div className="row"><button className={`switch ${state.memory?"on":""}`} role="switch" aria-checked={state.memory} aria-label="Learning memory" onClick={()=>setState(s=>({...s,memory:!s.memory}))}/><strong>{state.memory?"On":"Off"}</strong></div></section><section className="card"><h2>Data controls</h2><div className="setting-row"><div><strong>Raw voice recordings</strong><p className="fine">Deleted after transcription or assessment in the live product unless you explicitly keep them.</p></div><button className="button compact">Manage</button></div><div className="setting-row"><div><strong>Downloaded audio</strong><p className="fine">Files already on your device are not changed when a session revision changes.</p></div><Link href="/library" className="button compact">View</Link></div><div className="setting-row"><div><strong>Delete sample workspace history</strong><p className="fine">Removes this browser’s Numa demo state. It does not claim to delete live private data.</p></div><button className="button compact danger" onClick={()=>{localStorage.removeItem("numa-demo-v1");setState(initialState);setDeleted(true)}}><Trash2 size={15}/> Delete</button></div>{deleted&&<div className="notice">Sample workspace history was removed from this browser.</div>}</section><section className="card"><h2>Language</h2><div className="field"><label htmlFor="language">App and generated content</label><select id="language" className="select" defaultValue="en"><option value="en">English</option></select></div><p className="fine">Additional languages are planned but are not presented as available in v1.0.</p></section></div></div>;
}
