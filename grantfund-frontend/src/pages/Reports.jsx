// Reports Page — Filterable with CSV/PDF export + Charts
import { useState, useEffect } from 'react';
import { expenseAPI, grantAPI } from '../services/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  HiOutlineDownload, HiOutlineFilter, HiOutlineChartBar,
  HiOutlineDocumentReport, HiOutlineCurrencyDollar, HiOutlineCheckCircle,
  HiOutlineRefresh
} from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';

const Reports = () => {
  const [expenses, setExpenses] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ grantId: '', status: '', startDate: '', endDate: '' });

  useEffect(() => { fetchGrants(); fetchExpenses(); }, []);

  const fetchGrants = async () => {
    try { const res = await grantAPI.getAll(); setGrants(res.data.data); } catch {}
  };

  const fetchExpenses = async (params = {}) => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries({ ...filters, ...params }).filter(([_, v]) => v));
      const res = await expenseAPI.getAll(cleanParams);
      setExpenses(res.data.data);
    } catch { toast.error('Failed to load reports data'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => fetchExpenses();
  const clearFilters = () => { 
    setFilters({ grantId: '', status: '', startDate: '', endDate: '' }); 
    fetchExpenses({ grantId: '', status: '', startDate: '', endDate: '' }); 
  };

  const fmtC = (v) => `$${Number(v).toLocaleString()}`;
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // CSV Export
  const exportCSV = () => {
    const headers = ['Description', 'Grant', 'Category', 'Amount', 'Status', 'Submitted By', 'Date'];
    const rows = expenses.map(e => [
      e.description, e.grantId?.title || '', e.fundId?.category || '',
      e.amount, e.status, e.submittedBy?.name || '', fmt(e.createdAt)
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expense_report_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV Export Generated!');
  };

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22); 
    doc.setTextColor(31, 41, 55); // text-gray-800
    doc.text('Expense and Grant Report', 14, 22);
    
    doc.setFontSize(10); 
    doc.setTextColor(107, 114, 128); // text-gray-500
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);
    
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const approvedTotal = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
    
    // Add Summary Box
    doc.setDrawColor(229, 231, 235); // border-gray-200
    doc.setFillColor(249, 250, 251); // bg-gray-50
    doc.roundedRect(14, 35, 182, 20, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(`Total Records: ${expenses.length}`, 20, 43);
    doc.text(`Total Amount: ${fmtC(total)}`, 80, 43);
    doc.setTextColor(5, 150, 105); // text-emerald-600
    doc.text(`Approved: ${fmtC(approvedTotal)}`, 140, 43);

    doc.autoTable({
      startY: 60,
      head: [['Description', 'Grant', 'Category', 'Amount', 'Status', 'Date']],
      body: expenses.map(e => [
        e.description?.substring(0, 30) + (e.description?.length > 30 ? '...' : ''), 
        e.grantId?.title?.substring(0, 20) || '',
        e.fundId?.category || '', 
        fmtC(e.amount), 
        e.status, 
        fmt(e.createdAt)
      ]),
      styles: { fontSize: 9, cellPadding: 4 }, 
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' }, // Indigo-500
      alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
    });

    doc.save(`expense_report_${Date.now()}.pdf`);
    toast.success('PDF Export Generated!');
  };

  const badge = (s) => {
    const map = { Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', Pending: 'bg-amber-100 text-amber-700' };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>;
  };

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const approvedTotal = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);

  return (
    <AnimatedWrapper>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title text-gray-900 font-bold">Reports</h1>
          <p className="page-subtitle">Analyze expenses and generate financial reports</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} disabled={!expenses.length || loading} className="btn-secondary shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <HiOutlineDocumentReport className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={exportPDF} disabled={!expenses.length || loading} className="btn-primary shadow-primary-500/20 flex items-center justify-center gap-2 border border-transparent disabled:opacity-50">
            <HiOutlineDownload className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card delay={0.1} className="bg-white/50 border border-white/60 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/60 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <HiOutlineChartBar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-wider">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{expenses.length}</p>
            </div>
          </div>
        </Card>
        
        <Card delay={0.2} className="bg-white/50 border border-white/60 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/60 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <HiOutlineCurrencyDollar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-500/80 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmtC(totalAmount)}</p>
            </div>
          </div>
        </Card>

        <Card delay={0.3} className="bg-white/50 border border-white/60 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/60 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <HiOutlineCheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">Approved Amount</p>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{fmtC(approvedTotal)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Chart Section ────────────────────── */}
      {expenses.length > 0 && (() => {
        const fmtC2 = (v) => `$${Number(v).toLocaleString()}`;

        // By-category data
        const catMap = {};
        expenses.forEach(e => {
          const cat = e.fundId?.category || 'uncategorized';
          if (!catMap[cat]) catMap[cat] = { name: cat.charAt(0).toUpperCase() + cat.slice(1), total: 0, count: 0 };
          catMap[cat].total += e.amount;
          catMap[cat].count += 1;
        });
        const catData = Object.values(catMap).sort((a, b) => b.total - a.total);

        // Approval data for pie
        const pieData = [
          { name: 'Approved', value: expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0), color: '#10b981' },
          { name: 'Pending', value: expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0), color: '#f59e0b' },
          { name: 'Rejected', value: expenses.filter(e => e.status === 'Rejected').reduce((s, e) => s + e.amount, 0), color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Timeline data (group by month)
        const monthMap = {};
        expenses.forEach(e => {
          const d = new Date(e.createdAt);
          const k = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
          monthMap[k] = (monthMap[k] || 0) + e.amount;
        });
        const timelineData = Object.entries(monthMap).map(([name, amount]) => ({ name, amount }));

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Bar: by category */}
            <Card delay={0.35} className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 block" />
                  Expenses by Category
                </h3>
                <span className="text-xs text-gray-400">{catData.length} categories</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={fmtC2} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtC2(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontWeight: 'bold' }} />
                  <Bar dataKey="total" name="Total Amount" radius={[8, 8, 0, 0]} fill="url(#catGrad)" animationDuration={1200} />
                  <defs>
                    <linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie: approval status */}
            <Card delay={0.4}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600 block" />
                  Approval Rate
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none" animationDuration={1400}>
                    {pieData.map((item, i) => <Cell key={i} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtC2(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-semibold text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-extrabold text-gray-900">{fmtC2(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Area: monthly trend */}
            {timelineData.length > 1 && (
              <Card delay={0.45} className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-600 block" />
                    Expense Timeline
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={fmtC2} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmtC2(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="amount" name="Amount" stroke="#8b5cf6" strokeWidth={3} fill="url(#timeGrad)"
                      dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#7c3aed', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Filters Area */}
      <Card delay={0.4} className="mb-8 p-5 sm:p-6 bg-white border border-surface-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-surface-100 pb-4 mb-4">
          <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-gray-600">
            <HiOutlineFilter className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Filter Report Data</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Grant Filter</label>
            <select value={filters.grantId} onChange={e => setFilters(p => ({...p, grantId: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 focus:bg-primary-50/10 transition-all font-medium appearance-none">
              <option value="">All Grants</option>
              {grants.map(g => <option key={g._id} value={g._id}>{g.title}</option>)}
            </select>
          </div>
          
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Status Filter</label>
            <select value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 focus:bg-primary-50/10 transition-all font-medium appearance-none">
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Start Date</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 transition-all font-medium" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">End Date</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 transition-all font- medium" />
          </div>
        </div>
        
        <div className="flex sm:justify-end gap-3 pt-4 border-t border-surface-100">
          <button onClick={clearFilters} className="btn-secondary py-2 px-5 text-sm flex-1 sm:flex-none">Clear</button>
          <button onClick={applyFilters} className="btn-primary py-2 px-6 text-sm flex-1 sm:flex-none shadow-primary-500/20">Apply Filters</button>
        </div>
      </Card>

      {/* Results Table */}
      <Card delay={0.5} className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="ml-3 text-sm font-medium text-gray-500">Generating report data...</span>
          </div>
        ) : expenses.length > 0 ? (
          <div className="table-container border-0 rounded-none shadow-none">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-surface-50 pl-6 border-b border-surface-200">Description</th>
                  <th className="bg-surface-50 border-b border-surface-200">Grant</th>
                  <th className="bg-surface-50 border-b border-surface-200">Category</th>
                  <th className="bg-surface-50 border-b border-surface-200">Amount</th>
                  <th className="bg-surface-50 border-b border-surface-200">Status</th>
                  <th className="bg-surface-50 border-b border-surface-200">By</th>
                  <th className="bg-surface-50 pr-6 border-b border-surface-200 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {expenses.map((e, index) => (
                  <motion.tr 
                    key={e._id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-primary-50/30 transition-colors"
                  >
                    <td className="pl-6 py-4">
                      <p className="font-semibold text-gray-900 max-w-[200px] truncate">{e.description}</p>
                    </td>
                    <td className="py-4 text-sm text-gray-600 font-medium">{e.grantId?.title || 'N/A'}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-surface-100 text-xs font-semibold text-gray-700 capitalize">
                        {e.fundId?.category || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-gray-900">{fmtC(e.amount)}</td>
                    <td className="py-4">{badge(e.status)}</td>
                    <td className="py-4 text-sm text-gray-600">{e.submittedBy?.name || 'N/A'}</td>
                    <td className="pr-6 py-4 text-xs font-medium text-gray-500 text-right">{fmt(e.createdAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-white">
            <div className="w-16 h-16 bg-surface-100 text-surface-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineChartBar className="w-8 h-8" />
            </div>
            <p className="text-xl font-bold text-gray-900">No data found</p>
            <p className="text-gray-500 mt-2">Adjust your filters or submit new expenses to see results here.</p>
          </div>
        )}
      </Card>
    </AnimatedWrapper>
  );
};

export default Reports;

