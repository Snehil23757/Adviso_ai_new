import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, BarChart2, BrainCircuit, MessageSquare, 
  Lightbulb, DollarSign, TrendingUp, Compass, Leaf, Shield, Target,
  LogOut, UploadCloud, PieChart as PieChartIcon
} from "lucide-react";
import Papa from "papaparse";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell 
} from "recharts";

import LiveStrategyPortal from "./LiveStrategyPortal.tsx";

interface PlatformDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

type TabType = "Overview" | "Charts" | "AI" | "Chat" | "Ideas" | "Profit" | "Forecast" | "Budget" | "Sustainability" | "Competitor" | "KPI";

export default function PlatformDashboard({ userEmail, onLogout }: PlatformDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  
  // Data State
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // File Upload & Validation State
  const [isDragging, setIsDragging] = useState(false);
  const [stagedData, setStagedData] = useState<any[] | null>(null);
  const [stagedColumns, setStagedColumns] = useState<string[]>([]);
  const [previewColumn, setPreviewColumn] = useState<string | null>(null);

  const histogramData = React.useMemo(() => {
    if (!previewColumn || !stagedData) return [];
    const values = stagedData.map(row => row[previewColumn]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 20;
    const range = max - min;
    const binSize = range === 0 ? 1 : range / bins;
    
    const freqs = new Array(bins).fill(0);
    values.forEach(v => {
      let binIndex = Math.floor((v - min) / binSize);
      if (binIndex >= bins) binIndex = bins - 1;
      freqs[binIndex]++;
    });
    
    return freqs.map((freq, i) => {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const label = range === 0 ? `${min.toFixed(0)}` : `${binStart.toFixed(1)} - ${binEnd.toFixed(1)}`;
      return {
        bin: label,
        count: freq
      };
    });
  }, [previewColumn, stagedData]);

  // Tab 2: Charts State
  const [chartType, setChartType] = useState<"Scatter" | "Line" | "Bar">("Line");
  const [xAxisCol, setXAxisCol] = useState<string>("");
  const [yAxisCol, setYAxisCol] = useState<string>("");

  // Other Tabs Inputs (Profit, Forecast, Budget, Sustainability, Competitor)
  // Replicating Streamlit state briefly
  const [profitRev, setProfitRev] = useState(0);
  const [profitCost, setProfitCost] = useState(0);

  const [forecastCol, setForecastCol] = useState<string>("");
  const [forecastYears, setForecastYears] = useState(3);

  const [budgetIncome, setBudgetIncome] = useState(0);
  const [budgetExpense, setBudgetExpense] = useState(0);

  const [susBudget, setSusBudget] = useState(0);
  const [susGreen, setSusGreen] = useState(0);
  const [susEnergy, setSusEnergy] = useState(0);
  const [susCarbon, setSusCarbon] = useState(0);

  const [compMyRev, setCompMyRev] = useState(0);
  const [compTheirRev, setCompTheirRev] = useState(0);
  const [compMyCost, setCompMyCost] = useState(0);
  const [compTheirCost, setCompTheirCost] = useState(0);

  const processFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function(results) {
        setStagedData(results.data as any[]);
        setStagedColumns(results.meta.fields || []);
        setPreviewColumn(null);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input value so the same file can be uploaded again if canceled
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      processFile(file);
    }
  };

  const confirmImport = () => {
    if (stagedData) {
      setData(stagedData);
      setColumns(stagedColumns);
      setIsDataLoaded(true);
      
      if (stagedColumns && stagedColumns.length > 0) {
         setXAxisCol(stagedColumns[0]);
         setYAxisCol(stagedColumns[1] || stagedColumns[0]);
         setForecastCol(stagedColumns[1] || stagedColumns[0]);
      }
      setStagedData(null);
      setStagedColumns([]);
      setPreviewColumn(null);
    }
  };

  const cancelImport = () => {
    setStagedData(null);
    setStagedColumns([]);
    setPreviewColumn(null);
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
    { id: "Overview", label: "Overview", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: "Charts", label: "Charts", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "AI", label: "Strategy AI", icon: <BrainCircuit className="w-4 h-4" /> },
    { id: "Chat", label: "Data Chat", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "Ideas", label: "Ideas", icon: <Lightbulb className="w-4 h-4" /> },
    { id: "Profit", label: "Profit Analytics", icon: <DollarSign className="w-4 h-4" /> },
    { id: "Forecast", label: "Forecast Simulator", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "Budget", label: "Budget Planner", icon: <PieChartIcon className="w-4 h-4" /> },
    { id: "Sustainability", label: "ESG Matrix", icon: <Leaf className="w-4 h-4" /> },
    { id: "Competitor", label: "Competitor Analysis", icon: <Shield className="w-4 h-4" /> },
    { id: "KPI", label: "KPI Live", icon: <Target className="w-4 h-4" /> },
  ];

  // Helper colors for charts
  const COLORS = ['#4A63FF', '#38bdf8', '#22c55e', '#a855f7', '#f59e0b'];

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col font-sans">
      {/* Platform Header */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-primary flex items-center justify-center">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <span className="font-bold text-lg tracking-tight">ADVISO PLATFORM</span>
        </div>
        <div className="flex items-center gap-4">
          {!isDataLoaded ? (
            <label className="bg-brand-primary hover:bg-brand-primary/90 cursor-pointer text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition">
              <UploadCloud className="w-4 h-4" />
              Upload CSV Dataset
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          ) : (
            <button 
              onClick={() => {
                const csvData = Papa.unparse(data);
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", "adviso_export.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition text-white"
            >
              Export CSV Dataset
            </button>
          )}
          <div className="text-xs font-mono text-brand-text-secondary bg-white/5 px-3 py-1.5 rounded border border-white/10">
            {userEmail}
          </div>
          <button onClick={onLogout} className="text-rose-400 hover:text-white p-2 transition" aria-label="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-white/10 bg-black/20 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono text-brand-text-secondary tracking-widest uppercase mb-3 px-2">Navigation Modules</div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/10" 
                  : "text-brand-text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-black/40 p-8 relative">
          
          {/* Need Data overlay */}
          {!isDataLoaded && ["Overview", "Charts", "Chat", "Forecast", "KPI"].includes(activeTab) && (
            <div 
              className={`flex flex-col items-center justify-center p-20 text-center border-2 rounded-2xl transition-all ${
                isDragging ? "border-brand-primary bg-brand-primary/5 scale-[1.02]" : "border-white/10 bg-white/5 border-dashed"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <DatabaseIcon className={`w-12 h-12 mb-4 transition-colors ${
                isDragging ? "text-brand-primary" : "text-brand-text-secondary opacity-50"
              }`} />
              <h3 className="text-xl font-bold mb-2">
                {isDragging ? "Drop your CSV file here" : "Dataset Required for this Module"}
              </h3>
              <p className="text-sm text-brand-text-secondary mb-6 max-w-md mx-auto">
                {isDragging 
                  ? "Release to scan and import data payload" 
                  : "Upload a CSV payload to unlock dynamic analysis, charts, and forecasts. You can also drag and drop your file here."}
              </p>
              <label className={`cursor-pointer text-sm font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition ${
                isDragging ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-primary hover:bg-brand-primary/90 text-white"
              }`}>
                <UploadCloud className="w-4 h-4" />
                {isDragging ? "Ready to import" : "Upload CSV Dataset"}
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === "Overview" && isDataLoaded && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold">Data Set Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-brand-text-secondary uppercase">Total Rows</span>
                  <div className="text-3xl font-black mt-1 text-brand-primary">{data.length}</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-brand-text-secondary uppercase">Columns</span>
                  <div className="text-3xl font-black mt-1 text-emerald-400">{columns.length}</div>
                </div>
              </div>
              
              <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                 <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                   <h3 className="text-sm font-bold">Raw Payload Preview (Top 10)</h3>
                 </div>
                 <div className="overflow-x-auto max-h-[400px]">
                   <table className="w-full text-xs text-left">
                     <thead className="bg-black/50 sticky top-0">
                       <tr>
                         {columns.map(col => (
                           <th key={col} className="p-3 font-mono text-brand-text-secondary font-medium whitespace-nowrap">{col}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                       {data.slice(0, 10).map((row, idx) => (
                         <tr key={idx} className="hover:bg-white/5">
                           {columns.map(col => (
                             <td key={col} className="p-3 truncate max-w-xs">{String(row[col] ?? '')}</td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {/* TAB: CHARTS */}
          {activeTab === "Charts" && isDataLoaded && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold">Visual Analytics Board</h2>
              
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <select className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" value={chartType} onChange={(e: any) => setChartType(e.target.value)}>
                  <option value="Line">Line Chart</option>
                  <option value="Bar">Bar Chart</option>
                  <option value="Scatter">Scatter Plot</option>
                </select>
                <select className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" value={xAxisCol} onChange={(e) => setXAxisCol(e.target.value)}>
                  {columns.map(col => <option key={col} value={col}>{col} (X Axis)</option>)}
                </select>
                <select className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" value={yAxisCol} onChange={(e) => setYAxisCol(e.target.value)}>
                  {columns.map(col => <option key={col} value={col}>{col} (Y Axis)</option>)}
                </select>
              </div>

              <div className="h-[400px] w-full bg-black/20 border border-white/10 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "Line" ? (
                    <LineChart data={data.slice(0, 100)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey={xAxisCol} stroke="#888" tick={{fontSize: 10}} />
                      <YAxis stroke="#888" tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: '#050816', borderColor: '#ffffff20'}} />
                      <Line type="monotone" dataKey={yAxisCol} stroke="#4A63FF" strokeWidth={2} dot={false} />
                    </LineChart>
                  ) : chartType === "Bar" ? (
                    <BarChart data={data.slice(0, 50)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey={xAxisCol} stroke="#888" tick={{fontSize: 10}} />
                      <YAxis stroke="#888" tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: '#050816', borderColor: '#ffffff20'}} />
                      <Bar dataKey={yAxisCol} fill="#38bdf8" radius={[4,4,0,0]} />
                    </BarChart>
                  ) : (
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey={xAxisCol} name={xAxisCol} stroke="#888" tick={{fontSize: 10}} />
                      <YAxis dataKey={yAxisCol} name={yAxisCol} stroke="#888" tick={{fontSize: 10}} />
                      <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{backgroundColor: '#050816', borderColor: '#ffffff20'}} />
                      <Scatter data={data.slice(0, 200)} fill="#22c55e" />
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB: STRATEGY AI (Re-use existing portal) */}
          {activeTab === "AI" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Strategy Advisory Assistant</h2>
              <LiveStrategyPortal />
            </div>
          )}

          {/* TAB: CHAT */}
          {activeTab === "Chat" && isDataLoaded && (
            <div className="animate-fade-in flex flex-col h-[600px] bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <h2 className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand-primary" /> Data Chat Interface</h2>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">🤖</div>
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-none p-4 text-sm text-white/90">
                    I am examining your {data.length} rows of data. The dataset contains fields such as {columns.slice(0,3).join(", ")}. How can I help you extract value from this payload today?
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/10 bg-black/50">
                <div className="relative">
                  <input type="text" placeholder="Ask a question about the data..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:border-brand-primary" />
                  <button className="absolute right-2 top-2 p-1.5 bg-brand-primary rounded-lg text-white"><ArrowRightIcon className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IDEAS */}
          {activeTab === "Ideas" && (
            <div className="animate-fade-in space-y-6">
               <h2 className="text-2xl font-bold">Ideation Matrix Engine</h2>
               <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-xs uppercase text-brand-text-secondary">Industry Vector</label>
                     <input type="text" placeholder="e.g. HealthTech" className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-xs uppercase text-brand-text-secondary">Budget Level</label>
                     <select className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white">
                       <option>Low Bootstrapped</option>
                       <option>Medium Seed</option>
                       <option>High Scale</option>
                     </select>
                   </div>
                 </div>
                 <div className="flex gap-3 pt-2">
                   <button className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-sm font-bold justify-center py-2.5 rounded-lg flex items-center gap-2 transition">
                     🚀 Generate Startup Ideas
                   </button>
                   <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-sm font-bold justify-center py-2.5 rounded-lg flex items-center gap-2 transition">
                     📈 Expansion Strategies
                   </button>
                   <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-sm font-bold justify-center py-2.5 rounded-lg flex items-center gap-2 transition">
                     💰 Cost Optimization
                   </button>
                 </div>
               </div>
               
               {/* Output area */}
               <div className="h-64 border border-white/5 border-dashed rounded-xl flex items-center justify-center text-brand-text-secondary text-sm bg-black/10">
                  Select an ideation vector above.
               </div>
            </div>
          )}

          {/* TAB: PROFIT */}
          {activeTab === "Profit" && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-2xl font-bold mb-4">Profit Optimization</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <div className="space-y-1">
                   <label className="text-xs uppercase text-brand-text-secondary">Total Revenue Input (₹)</label>
                   <input type="number" value={profitRev} onChange={(e) => setProfitRev(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-brand-primary outline-none" />
                  </div>
                  <div className="space-y-1">
                   <label className="text-xs uppercase text-brand-text-secondary">Total Cost Overheads (₹)</label>
                   <input type="number" value={profitCost} onChange={(e) => setProfitCost(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-brand-primary outline-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs text-brand-primary">Calculated Profit</span>
                    <span className="text-3xl font-black text-white mt-1">₹{profitRev - profitCost}</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs text-emerald-400">Profit Margin</span>
                    <span className="text-3xl font-black text-white mt-1">
                      {profitRev ? Math.max(0, ((profitRev - profitCost)/profitRev)*100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MISC OTHERS: Forecast / Budget / Competitor essentially run same patterns. */}
          {["Forecast", "Budget", "Sustainability", "Competitor", "KPI"].includes(activeTab) && (
            <div className="animate-fade-in flex flex-col items-center justify-center p-20 text-center h-[500px] border border-white/5 rounded-2xl">
              <Compass className="w-12 h-12 text-brand-primary mb-4 animate-spin-slow opacity-50" />
              <h3 className="text-xl font-bold mb-2">{activeTab} Module Matrix</h3>
              <p className="text-sm text-brand-text-secondary max-w-md mx-auto">
                This specialized calculation dashboard provides inputs to model exact strategic frameworks for {activeTab.toLowerCase()} insights. Use the data inputs to synthesize interactive analytics scorecards.
              </p>
              <button disabled className="mt-6 px-6 py-2 rounded-lg bg-white/5 text-brand-text-secondary border border-white/10 text-xs font-bold uppercase cursor-not-allowed">
                Initializing Matrix Parameters...
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Dataset Validation Overlay */}
      {stagedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#050816]/90 backdrop-blur-md"
            onClick={cancelImport}
          />
          
          {/* Validation Card */}
          <div className="relative w-full max-w-5xl max-h-[85vh] bg-brand-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in dot-grid text-left">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-black/40 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans tracking-tight text-white">Validate Dataset Import</h3>
                  <p className="text-sm text-brand-text-secondary mt-0.5">
                    Found <span className="text-white font-mono">{stagedData.length}</span> records with <span className="text-white font-mono">{stagedColumns.length}</span> columns. Please verify sample rows.
                  </p>
                </div>
              </div>
              <button 
                onClick={cancelImport} 
                className="p-2 hover:bg-white/10 rounded-xl transition text-brand-text-secondary hover:text-white"
                aria-label="Cancel Import"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            
            {/* Split Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
              
              {/* Header Analysis Sidebar */}
              <div className="w-full md:w-1/3 border-r border-white/10 bg-black/40 p-6 overflow-y-auto">
                 <h4 className="text-xs font-mono font-bold text-brand-primary uppercase tracking-widest mb-4">Detected Schema</h4>
                 <div className="space-y-2">
                   {stagedColumns.map(col => {
                     let t = 'String';
                     const sample = stagedData.find(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
                     if (sample) {
                       if (typeof sample[col] === 'number') t = 'Number';
                       else if (typeof sample[col] === 'boolean') t = 'Boolean';
                     } else {
                       t = 'Empty';
                     }
                     const isNumeric = t === 'Number';
                     const isSelected = previewColumn === col;
                     
                     const missingCount = stagedData.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
                     const totalCount = stagedData.length;
                     const missingPercent = totalCount > 0 ? ((missingCount / totalCount) * 100).toFixed(1) : '0.0';

                     return (
                       <div 
                         key={col} 
                         onClick={() => { if (isNumeric) setPreviewColumn(isSelected ? null : col); }}
                         className={`rounded-lg p-3 flex flex-col gap-2 transition ${
                           isNumeric ? 'cursor-pointer hover:bg-white/10' : ''
                         } ${
                           isSelected ? 'bg-brand-primary/10 border border-brand-primary/50' : 'bg-white/5 border border-white/10'
                         }`}
                       >
                         <div className="flex items-center justify-between">
                           <div className="flex flex-col pr-2 overflow-hidden">
                             <span className="text-sm font-medium text-white truncate" title={col}>{col}</span>
                             {isNumeric && !isSelected && <span className="text-[9px] text-brand-text-secondary mt-0.5">Click for distribution</span>}
                           </div>
                           <span className={`flex-shrink-0 text-[10px] font-mono uppercase px-2 py-1 rounded border ${
                             t === 'Number' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                             t === 'Boolean' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                             t === 'Empty' ? 'bg-white/5 text-brand-text-secondary border-white/10' :
                             'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                           }`}>
                             {t}
                           </span>
                         </div>
                         <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono">
                           <span className="text-brand-text-secondary">Missing Values</span>
                           <span className={missingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                             {missingCount} ({missingPercent}%)
                           </span>
                         </div>
                       </div>
                     )
                   })}
                 </div>
              </div>

              {/* Sample Data Area */}
              <div className="w-full md:w-2/3 flex flex-col p-6 bg-[#050816]/50 overflow-hidden">
                {previewColumn && histogramData.length > 0 && (
                  <div className="mb-6 bg-black/40 border border-brand-primary/20 rounded-xl p-4 flex flex-col flex-shrink-0 animate-fade-in shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-mono font-bold text-brand-primary uppercase tracking-widest">Distribution: <span className="text-white">{previewColumn}</span></h4>
                      <button onClick={() => setPreviewColumn(null)} className="text-[10px] uppercase font-bold text-brand-text-secondary hover:text-white transition">Close Chart</button>
                    </div>
                    <div className="h-40 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="bin" stroke="#888" tick={{fontSize: 9}} minTickGap={10} />
                          <YAxis stroke="#888" tick={{fontSize: 10}} width={40} />
                          <Tooltip 
                            cursor={{fill: '#ffffff05'}} 
                            contentStyle={{backgroundColor: '#050816', borderColor: '#ffffff20', fontSize: '12px'}} 
                            formatter={(value: any) => [value, 'Frequency']}
                          />
                          <Bar dataKey="count" fill="#4A63FF" radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                <h4 className="text-xs font-mono font-bold text-brand-text-secondary uppercase tracking-widest mb-4 flex-shrink-0">Data Payload Sample</h4>
                <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-inner flex flex-col min-h-0">
                  <div className="overflow-auto flex-1">
                     <table className="w-full text-xs text-left">
                       <thead className="bg-[#0b1120] sticky top-0 shadow-md z-10 border-b border-white/10">
                         <tr>
                           <th className="p-3 text-brand-text-secondary/50 font-mono w-10 text-center">#</th>
                           {stagedColumns.map(col => (
                             <th key={col} className="p-3 font-mono text-brand-primary font-medium whitespace-nowrap uppercase tracking-wider">{col}</th>
                           ))}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {stagedData.slice(0, 10).map((row, idx) => (
                           <tr key={idx} className="hover:bg-white/5 transition-colors">
                             <td className="p-3 text-brand-text-secondary/40 font-mono text-center">{idx + 1}</td>
                             {stagedColumns.map(col => (
                               <td key={col} className="p-3 truncate max-w-[200px] text-white/90" title={String(row[col] ?? '')}>
                                 {String(row[col] ?? '')}
                               </td>
                             ))}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
                  {stagedData.length > 10 && (
                    <div className="p-3 text-center text-xs font-mono text-brand-text-secondary bg-black/20 border-t border-white/5 flex-shrink-0">
                      ... and {stagedData.length - 10} more rows
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/60 relative z-10 backdrop-blur-sm">
              <button 
                onClick={cancelImport} 
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={confirmImport} 
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20 transition hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Authorize & Import Dataset</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helpers
function DatabaseIcon(props: any) {
  return <Database {...props} />;
}
function ArrowRightIcon(props: any) {
  return <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} />;
}
import { Database } from "lucide-react";
