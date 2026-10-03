import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const DEFAULT_FINDINGS = ['Atelectasis','Cardiomegaly','Consolidation','Edema','Effusion','Emphysema','Fibrosis','Hernia','Infiltration','Mass','Nodule','Pleural_Thickening','Pneumonia','Pneumothorax']

const iconPaths = {
  upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
  scan: <><path d="M9 3H6a3 3 0 0 0-3 3v3"/><path d="M15 3h3a3 3 0 0 1 3 3v3"/><path d="M21 15v3a3 3 0 0 1-3 3h-3"/><path d="M3 15v3a3 3 0 0 0 3 3h3"/><circle cx="12" cy="12" r="4"/></>,
  moon: <path d="M20 15.3A8 8 0 1 1 8.7 4 6.5 6.5 0 0 0 20 15.3Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  close: <><path d="M6 6l12 12M18 6 6 18"/></>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></>,
  print: <><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  spark: <><path d="m12 2 1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  back: <><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></>,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 14h4M1 9h4M1 14h4"/></>,
  pulse: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
}
function Icon({name,size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>}

function fmtName(name=''){ return name.replaceAll('_',' ') }
function clamp(v,min=0,max=100){ return Math.min(max,Math.max(min,Number(v)||0)) }
function scoreTone(v){ if(v >= 70) return 'strong'; if(v >= 45) return 'medium'; return 'light' }

async function api(path, options={}){
  const res = await fetch(`${API}${path}`, options)
  const data = await res.json().catch(()=>null)
  if(!res.ok){
    const message = typeof data?.detail === 'string' ? data.detail : data?.detail?.message
    throw new Error(message || `Request failed (${res.status})`)
  }
  return data
}

function App(){
  const [dark,setDark] = useState(()=>localStorage.getItem('qrad-theme') === 'dark')
  const [page,setPage] = useState('scan')
  const [file,setFile] = useState(null)
  const [preview,setPreview] = useState('')
  const [drag,setDrag] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [result,setResult] = useState(null)
  const [findings,setFindings] = useState(DEFAULT_FINDINGS)
  const [history,setHistory] = useState([])
  const [info,setInfo] = useState(null)
  const [circuit,setCircuit] = useState(null)
  const [loadStage,setLoadStage] = useState(0)
  const inputRef = useRef(null)

  useEffect(()=>{
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('qrad-theme', dark ? 'dark' : 'light')
  },[dark])

  useEffect(()=>{
    api('/api/config').then(d=>setFindings(d.findings || DEFAULT_FINDINGS)).catch(()=>{})
    api('/api/history').then(d=>setHistory(d.items || [])).catch(()=>{})
  },[])

  useEffect(()=>{
    if(result && page === 'quantum' && !circuit) api('/api/quantum/circuit').then(setCircuit).catch(()=>{})
  },[result,page,circuit])

  useEffect(()=>{
    if(!busy) return
    const timer=setInterval(()=>setLoadStage(s=>(s+1)%4),1500)
    return ()=>clearInterval(timer)
  },[busy])

  function clearFile(){
    if(preview) URL.revokeObjectURL(preview)
    setFile(null);setPreview('');setError('')
  }
  function selectFile(f){
    if(!f) return
    const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(f.type)
    if(!ok){ setError('Choose a PNG, JPG, JPEG or WEBP image.'); return }
    if(f.size > 15*1024*1024){ setError('The selected image is larger than 15 MB.'); return }
    if(preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }
  function drop(e){
    e.preventDefault();setDrag(false)
    selectFile([...e.dataTransfer.files][0])
  }
  async function analyze(){
    if(!file || busy) return
    setBusy(true);setLoadStage(0);setError('')
    try{
      const fd = new FormData()
      fd.append('file',file)
      const data = await api('/api/analyze',{method:'POST',body:fd})
      setResult(data)
      setPage('overview')
      api('/api/history').then(d=>setHistory(d.items || [])).catch(()=>{})
      api('/api/info').then(setInfo).catch(()=>{})
    }catch(err){
      setError(err.message || 'Analysis could not be completed. Please try again.')
    }finally{setBusy(false)}
  }
  function reset(){
    if(preview) URL.revokeObjectURL(preview)
    setFile(null);setPreview('');setResult(null);setError('');setPage('scan');setCircuit(null)
  }
  async function openHistory(id){
    try{
      const d = await api(`/api/history/${id}`)
      setResult(d);setFile(null);setPreview('');setPage('overview');setError('')
    }catch(e){setError(e.message)}
  }
  async function exportReport(){
    if(!result) return
    try{
      const d = await api(`/api/report/${result.analysis_id}`)
      const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob);const a=document.createElement('a')
      a.href=url;a.download=`qrad-report-${result.analysis_id}.json`;a.click();URL.revokeObjectURL(url)
    }catch(e){setError(e.message)}
  }

  const topClassical = useMemo(()=>[...(result?.classical||[])].sort((a,b)=>(b.score??-1)-(a.score??-1))[0], [result])
  const topQuantum = useMemo(()=>[...(result?.quantum||[])].sort((a,b)=>(b.score??-1)-(a.score??-1))[0], [result])

  return <div className="app">
    <header className="nav-shell">
      <div className="nav-inner">
        <button className="brand-button" onClick={reset} aria-label="Go to Q-RAD home">
          <span className="brand-symbol"><i></i><i></i><i></i></span>
          <span className="brand-copy"><b>Q-RAD</b><small>QUANTUM RADIOLOGY</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Primary">
          <button className={page==='scan'?'active':''} onClick={()=>setPage(result?'overview':'scan')}>Scan</button>
          {result && <><button className={['overview','findings'].includes(page)?'active':''} onClick={()=>setPage('overview')}>Results</button><button className={['quantum','explain','how'].includes(page)?'active':''} onClick={()=>setPage('quantum')}>Technology</button></>}
        </nav>
        <div className="nav-right">
          {result && <button className="nav-quiet" onClick={reset}><Icon name="scan" size={16}/> New scan</button>}
          <button className="theme-toggle" onClick={()=>setDark(v=>!v)} title="Toggle theme"><Icon name={dark?'sun':'moon'} size={18}/></button>
        </div>
      </div>
    </header>

    <main className="page-shell">
      {!result ? <ScanPage file={file} preview={preview} drag={drag} setDrag={setDrag} selectFile={selectFile} drop={drop} analyze={analyze} busy={busy} loadStage={loadStage} error={error} inputRef={inputRef} dark={dark} history={history} openHistory={openHistory}/> :
      <ResultsPage result={result} preview={preview} page={page} setPage={setPage} topClassical={topClassical} topQuantum={topQuantum} findings={findings} info={info} circuit={circuit} setCircuit={setCircuit} exportReport={exportReport} error={error} setError={setError}/>} 
    </main>

    <footer className="footer-shell"><span>Q-RAD · Quantum Radiology</span><span>Hybrid AI analysis prototype</span></footer>
  </div>
}

function ScanPage({file,preview,drag,setDrag,selectFile,drop,analyze,busy,loadStage,error,inputRef,dark,history,openHistory}){
  const stages=['Reading scan','Extracting visual representation','Comparing analysis paths','Preparing report']
  return <div className="scan-page">
    <section className="scan-hero">
      <div className="hero-copy-block">
        <span className="kicker"><i></i> CHEST X-RAY ANALYSIS</span>
        <h1>Turn a chest X-ray into a clear, readable analysis.</h1>
        <p>Upload one image to explore finding signals, model comparison, visual explanation, and the quantum analysis behind the result.</p>
        <div className="hero-chips"><span>Multiple findings</span><span>Visual explanation</span><span>Classical + quantum</span></div>
      </div>
      <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-a"></div><div className="orbit orbit-b"></div><div className="orbit-core"><span></span></div><b>Q</b></div>
    </section>

    <section className="scan-grid">
      <div className="upload-workspace">
        <div className={`drop-card ${drag?'dragging':''} ${file?'has-file':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={drop} onClick={()=>!file&&inputRef.current?.click()}>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden onChange={e=>selectFile(e.target.files?.[0])}/>
          {file ? <>
            <div className="selected-head"><span className="soft-status">Image selected</span><button className="circle-btn" onClick={e=>{e.stopPropagation();clearFile()}}><Icon name="close" size={16}/></button></div>
            <div className="selected-preview"><img src={preview} alt="Selected chest X-ray"/><div className="preview-shine"></div></div>
            <div className="file-meta"><b>{file.name}</b><span>{(file.size/1024/1024).toFixed(2)} MB · Ready for analysis</span></div>
          </> : <>
            <div className="upload-glyph"><Icon name="upload" size={30}/></div>
            <h2>Drop your chest X-ray here</h2>
            <p>or <strong>choose an image from your device</strong></p>
            <span className="format-line">PNG · JPG · JPEG · WEBP</span>
          </>}
        </div>
        <button className="analyze-btn" disabled={!file || busy} onClick={analyze}>{busy?<><span className="spinner"></span> Analyzing…</>:<><Icon name="scan" size={19}/> Analyze X-ray <Icon name="arrow" size={18}/></>}</button>
        {busy && <div className="progress-panel"><div className="progress-top"><span>{stages[loadStage]}</span><span>Q-RAD</span></div><div className="progress-track"><i></i></div><div className="progress-steps">{stages.map((s,i)=><span key={s} className={i===loadStage?'active':''}><b>{String(i+1).padStart(2,'0')}</b>{s}</span>)}</div></div>}
        {error && <div className="error-panel"><Icon name="info" size={18}/><span>{error}</span></div>}
      </div>

      <aside className="side-panel">
        <div className="side-card accent-card"><span className="side-eyebrow">ONE IMAGE. ONE REPORT.</span><h3>Designed for a fast first read.</h3><p>Start with a clean summary, then open the deeper technical views only when you need them.</p><div className="tiny-flow"><span>Scan</span><i></i><span>Analyze</span><i></i><span>Explore</span></div></div>
        <div className="side-card"><div className="side-title"><span>Recent scans</span><Icon name="history" size={17}/></div>{history.length ? history.slice(0,4).map(h=><button className="history-row" key={h.analysis_id} onClick={()=>openHistory(h.analysis_id)}><span className="history-dot"></span><span><b>{h.filename}</b><small>{fmtName(h.top_finding)}</small></span><Icon name="chevron" size={14}/></button>) : <div className="history-empty">Your completed scans will appear here during this session.</div>}</div>
      </aside>
    </section>

    <section className="quiet-features">
      <div><span className="feature-number">01</span><div><b>Clear overview</b><p>See the main finding signals before the deeper details.</p></div></div>
      <div><span className="feature-number">02</span><div><b>Visual explanation</b><p>Inspect an attention view generated for the scan.</p></div></div>
      <div><span className="feature-number">03</span><div><b>Quantum view</b><p>Open the quantum representation and kernel analysis after processing.</p></div></div>
    </section>
  </div>
}

function ResultsPage({result,preview,page,setPage,topClassical,topQuantum,findings,info,circuit,setCircuit,exportReport,error,setError}){
  const displayPreview = preview || (result.image_base64 ? `data:${result.content_type || 'image/png'};base64,${result.image_base64}` : '')
  return <div className="results-page">
    <section className="result-topbar">
      <div><span className="kicker"><i></i> ANALYSIS COMPLETE</span><h1>Q-RAD scan report</h1><p>{result.filename} · {result.server_seconds}s processing time</p></div>
      <div className="result-actions"><button className="ghost-btn" onClick={()=>window.print()}><Icon name="print" size={16}/> Print</button><button className="primary-small" onClick={exportReport}><Icon name="download" size={16}/> Export</button></div>
    </section>
    <nav className="result-nav"><button className={page==='overview'?'active':''} onClick={()=>setPage('overview')}>Overview</button><button className={page==='findings'?'active':''} onClick={()=>setPage('findings')}>Findings</button><button className={page==='quantum'?'active':''} onClick={()=>setPage('quantum')}>Quantum</button><button className={page==='explain'?'active':''} onClick={()=>setPage('explain')}>Explainability</button><button className={page==='how'?'active':''} onClick={()=>setPage('how')}>How it works</button></nav>
    {error && <div className="error-panel result-error"><Icon name="info" size={18}/><span>{error}</span><button onClick={()=>setError('')}><Icon name="close" size={15}/></button></div>}
    {page==='overview' && <Overview result={result} preview={displayPreview} topClassical={topClassical} topQuantum={topQuantum} setPage={setPage}/>} 
    {page==='findings' && <FindingsPage result={result}/>} 
    {page==='quantum' && <QuantumPage result={result} circuit={circuit} setCircuit={setCircuit}/>} 
    {page==='explain' && <ExplainPage result={result}/>} 
    {page==='how' && <HowPage result={result} info={info}/>} 
    <div className="report-note"><Icon name="info" size={16}/><span>Q-RAD is a software prototype. Model scores are presented for system analysis and should not be interpreted as calibrated clinical probabilities or a standalone diagnosis.</span></div>
  </div>
}

function Overview({result,preview,topClassical,topQuantum,setPage}){
  const classical = [...(result.classical||[])].sort((a,b)=>(b.score??-1)-(a.score??-1))
  const agreed=result.comparison?.agreed_findings||[]
  const positives=classical.filter(x=>x.predicted)
  return <div className="content-stack">
    <section className="overview-grid">
      <div className="scan-view card">
        <div className="card-head"><span>SCAN</span><span className="status-pill"><i></i> Processed</span></div>
        <div className="scan-frame"><img src={preview || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='} alt="Analyzed chest X-ray"/><div className="scan-gridlines"></div><div className="corner c1"></div><div className="corner c2"></div><div className="corner c3"></div><div className="corner c4"></div></div>
        <div className="scan-caption"><span><Icon name="check" size={14}/> Image processed</span><span>224 × 224 analysis input</span></div>
      </div>
      <div className="summary-view">
        <div className="summary-card main-summary">
          <div className="eyebrow-row"><span className="card-label">PRIMARY SIGNAL</span><span className="rank-badge">01</span></div>
          <div className="primary-finding">{fmtName(topClassical?.name || '—')}</div>
          <div className="primary-score"><b>{topClassical?.score?.toFixed(1) || '—'}%</b><span>model score</span></div>
          <div className="score-meter"><i style={{width:`${clamp(topClassical?.score)}%`}}></i></div>
          <div className="summary-foot"><span>Classical analysis</span>{topQuantum && <span>Quantum · {fmtName(topQuantum.name)} {topQuantum.score.toFixed(1)}%</span>}</div>
        </div>
        <div className="mini-summary-grid"><Stat title="Signals" value={positives.length}/><Stat title="Agreement" value={agreed.length}/><Stat title="CNN vector" value="1024D"/><Stat title="Quantum input" value={`${result.quantum_input_dimension || 4}D`}/></div>
        <button className="deep-link" onClick={()=>setPage('findings')}><span>Open complete finding landscape</span><Icon name="arrow" size={17}/></button>
      </div>
    </section>

    <section className="card top-findings-card"><div className="section-header"><div><span className="card-label">FINDING LANDSCAPE</span><h2>The signals in this scan</h2></div><button className="text-link" onClick={()=>setPage('findings')}>View all <Icon name="arrow" size={15}/></button></div><div className="top-finding-list">{classical.slice(0,6).map((x,i)=><SignalRow key={x.name} item={x} rank={i}/>)}</div></section>

    <section className="overview-bottom-grid">
      <div className="card compare-card"><div className="section-header"><div><span className="card-label">CLASSICAL × QUANTUM</span><h3>Two analysis paths, one scan</h3></div><Icon name="layers" size={20}/></div><div className="compare-columns"><CompareBox title="Classical" item={topClassical} /><CompareBox title="Quantum" item={topQuantum} empty={!topQuantum}/></div><div className="compare-footer"><span>{agreed.length} finding{agreed.length===1?'':'s'} shared across both paths</span><button className="text-link" onClick={()=>setPage('quantum')}>Explore quantum <Icon name="arrow" size={15}/></button></div></div>
      <div className="card glance-card"><div className="card-label">SCAN AT A GLANCE</div><div className="glance-item"><span>Processing time</span><b>{result.timings?.total_seconds}s</b></div><div className="glance-item"><span>Visual explanation</span><b>Available</b></div><div className="glance-item"><span>Finding outputs</span><b>14</b></div><div className="glance-item"><span>Quantum analysis</span><b>{result.quantum?.length ? 'Available' : 'Unavailable'}</b></div></div>
    </section>
  </div>
}
function Stat({title,value}){return <div className="mini-stat"><span>{title}</span><b>{value}</b></div>}
function SignalRow({item,rank}){return <div className="signal-row"><span className="rank">{String(rank+1).padStart(2,'0')}</span><div className="signal-name"><b>{fmtName(item.name)}</b>{item.predicted&&<small>signal</small>}</div><div className="signal-bar"><i className={scoreTone(item.score)} style={{width:`${clamp(item.score)}%`}}></i></div><b className="signal-score">{item.score?.toFixed(1) ?? '—'}%</b></div>}
function CompareBox({title,item,empty}){return <div className="compare-box"><span>{title}</span>{empty?<b className="dim">—</b>:<><b>{fmtName(item.name)}</b><strong>{item.score.toFixed(1)}%</strong></>}</div>}

function FindingsPage({result}){
  const classical=[...(result.classical||[])].sort((a,b)=>(b.score??-1)-(a.score??-1))
  const quantumMap=Object.fromEntries((result.quantum||[]).map(x=>[x.name,x]))
  return <div className="content-stack"><section className="page-intro"><div><span className="kicker"><i></i> FINDING LANDSCAPE</span><h2>All radiological finding signals</h2><p>Each output is evaluated independently, so multiple findings can appear in the same scan.</p></div><div className="count-badge">{classical.length} findings</div></section><section className="finding-grid">{classical.map((item,i)=><FindingCard key={item.name} item={item} quantum={quantumMap[item.name]} rank={i}/>)}</section></div>
}
function FindingCard({item,quantum,rank}){return <article className="finding-card"><div className="finding-card-top"><span>{String(rank+1).padStart(2,'0')}</span><span className={item.predicted?'positive-pill':''}>{item.predicted?'signal':'low signal'}</span></div><h3>{fmtName(item.name)}</h3><div className="big-score">{item.score.toFixed(1)}<small>%</small></div><div className="full-meter"><i style={{width:`${clamp(item.score)}%`}}></i></div><div className="finding-duo"><span>Classical</span><b>{item.score.toFixed(1)}%</b></div><div className="finding-duo"><span>Quantum</span><b>{quantum?.score!=null?`${quantum.score.toFixed(1)}%`:'—'}</b></div></article>}

function QuantumPage({result,circuit,setCircuit}){
  const quantum=[...(result.quantum||[])].sort((a,b)=>(b.score??-1)-(a.score??-1))
  const meta=result.quantum_meta||{}
  useEffect(()=>{if(!circuit) api('/api/quantum/circuit').then(setCircuit).catch(()=>{})},[circuit,setCircuit])
  return <div className="content-stack"><section className="tech-hero card"><div><span className="kicker"><i></i> QUANTUM ANALYSIS</span><h2>Inside the quantum path</h2><p>The compact CNN representation is transformed into a four-dimensional quantum input, encoded by a ZZ feature map, then evaluated using a fidelity-based kernel and QSVC classifiers.</p></div><div className="tech-badges"><TechBadge value="4" label="Qubits"/><TechBadge value={circuit?.depth || 19} label="Depth"/><TechBadge value="ZZ" label="Feature map"/><TechBadge value="QSVC" label="Classifier"/></div></section>
  <section className="quantum-grid"><div className="card quantum-input-card"><div className="card-label">CURRENT QUANTUM REPRESENTATION</div><div className="qubit-visual">{(meta.input_values||[0,0,0,0]).map((v,i)=><div className="qubit" key={i}><span>q{i+1}</span><div className="qubit-ring"><i style={{transform:`rotate(${Number(v)*90}deg)`}}></i></div><b>{Number(v).toFixed(3)}</b></div>)}</div><div className="formula-box"><span>Representation</span><b>1024D → PCA → 4D → quantum encoding</b></div></div>
  <div className="card heatmap-card"><div className="section-header"><div><span className="card-label">FIDELITY KERNEL</span><h3>Sample similarity</h3></div><span className="kernel-tag">|⟨φ(xᵢ)|φ(xⱼ)⟩|²</span></div><img src={`${API}/api/assets/quantum_kernel_heatmap.png`} alt="Quantum kernel similarity heatmap" onError={e=>{e.currentTarget.style.display='none'}}/><p>The diagonal reflects self-similarity; off-diagonal values show the kernel response between different samples.</p></div></section>
  <section className="quantum-bottom-grid"><div className="card circuit-card"><div className="section-header"><div><span className="card-label">CIRCUIT</span><h3>Quantum feature map</h3></div><button className="small-outline" onClick={()=>api('/api/quantum/circuit').then(setCircuit)}>Refresh</button></div><div className="circuit-draw"><CircuitSVG depth={circuit?.depth||19}/></div><div className="circuit-meta"><span>4 qubits</span><span>2 repetitions</span><span>Linear entanglement</span></div></div><div className="card q-score-card"><div className="card-label">QSVC FINDING SIGNALS</div>{quantum.length ? quantum.slice(0,8).map((x,i)=><SignalRow key={x.name} item={x} rank={i}/>) : <div className="empty-copy">Quantum output will appear after a completed hybrid analysis.</div>}<div className="q-foot">{quantum.length ? `${quantum.length} quantum outputs` : 'Quantum output unavailable'}</div></div></section></div>
}
function TechBadge({value,label}){return <div className="tech-badge"><b>{value}</b><span>{label}</span></div>}
function CircuitSVG({depth}){return <svg className="circuit-svg" viewBox="0 0 760 220" role="img" aria-label={`Four-qubit quantum feature map circuit, depth ${depth}`}><g className="wires">{[50,90,130,170].map((y,i)=><React.Fragment key={y}><line x1="36" y1={y} x2="724" y2={y}/><text x="10" y={y+5}>q{i}</text></React.Fragment>)}</g>{[120,250,380,510,640].map((x,i)=><React.Fragment key={x}><rect className="gate" x={x} y="32" width="44" height="28" rx="6"/><text x={x+22} y="51" textAnchor="middle">RZ</text><rect className="gate" x={x} y="72" width="44" height="28" rx="6"/><text x={x+22} y="91" textAnchor="middle">RZ</text><rect className="gate" x={x} y="112" width="44" height="28" rx="6"/><text x={x+22} y="131" textAnchor="middle">RZ</text><rect className="gate" x={x} y="152" width="44" height="28" rx="6"/><text x={x+22} y="171" textAnchor="middle">RZ</text><line className="entangle" x1={x+22} y1="60" x2={x+22} y2="72"/><line className="entangle" x1={x+22} y1="100" x2={x+22} y2="112"/><line className="entangle" x1={x+22} y1="140" x2={x+22} y2="152"/><circle className="dot" cx={x+22} cy="66" r="5"/><circle className="dot" cx={x+22} cy="106" r="5"/><circle className="dot" cx={x+22} cy="146" r="5"/></React.Fragment>)}<text className="depth-label" x="620" y="210">depth {depth}</text></svg>}

function ExplainPage({result}){return <div className="content-stack"><section className="page-intro"><div><span className="kicker"><i></i> EXPLAINABILITY</span><h2>See where the network is looking</h2><p>An attention view generated from the DenseNet output selected for this scan.</p></div><span className="count-badge"><Icon name="eye" size={15}/> Visual aid</span></section><section className="explain-grid"><div className="card attention-card"><div className="card-label">GRAD-CAM ATTENTION VIEW</div>{result.gradcam_base64?<img src={`data:image/png;base64,${result.gradcam_base64}`} alt="Grad-CAM attention visualization"/>:<div className="empty-copy">No attention image was returned for this analysis.</div>}<div className="attention-caption"><span>Selected target</span><b>{fmtName(result.cnn_reference?.[0]?.name || result.top_finding)}</b></div></div><div className="card explain-card"><div className="card-label">HOW TO READ THIS</div><ExplainStep n="01" title="Feature extraction" text="The scan is transformed into a compact visual representation for downstream analysis."/><ExplainStep n="02" title="Finding outputs" text="The application evaluates each radiological finding independently."/><ExplainStep n="03" title="Attention view" text="Grad-CAM highlights image regions that contribute to the selected network output."/><ExplainStep n="04" title="Interpretation" text="Use the visualization as a model-inspection aid, not as proof that a highlighted region is clinically present."/></div></section></div>}
function ExplainStep({n,title,text}){return <div className="explain-step"><span>{n}</span><div><b>{title}</b><p>{text}</p></div></div>}

function HowPage({result,info}){const q=info?.quantum || {}; return <div className="content-stack"><section className="page-intro"><div><span className="kicker"><i></i> HOW IT WORKS</span><h2>From pixels to a hybrid report</h2><p>The technical path behind the interface, explained without hiding the important details.</p></div></section><section className="pipeline-card card"><PipelineNode n="01" title="Chest X-ray" sub="Image input"/><ArrowUI/><PipelineNode n="02" title="DenseNet-121" sub="1024D visual representation"/><div className="pipeline-split"><div><PipelineNode n="03A" title="One-vs-Rest SVM" sub="Classical path"/></div><div><PipelineNode n="03B" title="PCA → 4D" sub="Quantum compression"/><ArrowUI/><PipelineNode n="04" title="ZZ Feature Map" sub={`${q.qubits||4} qubits`}/><ArrowUI/><PipelineNode n="05" title="Fidelity Quantum Kernel" sub="Similarity in feature space"/><ArrowUI/><PipelineNode n="06" title="QSVC" sub="14 independent classifiers"/></div></div><ArrowUI/><PipelineNode n="07" title="Finding report" sub="Signals + comparison + explanation"/></section><section className="technical-grid"><TechInfo title="Classical path" rows={[["Classifier",info?.classical?.type||'One-vs-Rest Linear SVM'],['Feature vector',`${info?.cnn?.feature_dimension||1024}D`],['Outputs','14 independent finding signals']]}/><TechInfo title="Quantum path" rows={[["Qubits",q.qubits||4],["Repetitions",q.reps||2],["Feature map",q.feature_map||'ZZ Feature Map'],["Kernel",q.kernel||'Fidelity Quantum Kernel'],["Classifier",q.classifier||'QSVC']]}/><TechInfo title="This run" rows={[["Input",result.filename],['Processing',`${result.timings?.total_seconds}s`],['Quantum input',`${result.quantum_input_dimension||4}D`]]}/></section></div>}
function PipelineNode({n,title,sub}){return <div className="pipeline-node"><span>{n}</span><b>{title}</b><small>{sub}</small></div>}
function ArrowUI(){return <div className="pipeline-arrow"><Icon name="arrow" size={17}/></div>}
function TechInfo({title,rows}){return <div className="card tech-info"><div className="card-label">{title}</div>{rows.map(([a,b])=><div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}</div>}

createRoot(document.getElementById('root')).render(<App/>)
