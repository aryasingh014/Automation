import { create } from 'zustand';

const useGrantStore = create((set, get) => ({
  grants: [],
  setGrants: (grants) => set({ grants }),
  
  // Filters
  search: '',
  setSearch: (search) => set({ search }),
  
  statusFilter: 'All',
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  
  agencyFilter: 'All',
  setAgencyFilter: (agencyFilter) => set({ agencyFilter }),
  
  // Sorting: 'deadline', 'amount', 'recent'
  sortBy: 'recent',
  setSortBy: (sortBy) => set({ sortBy }),

  // Derived State Getter
  getFilteredSortedGrants: () => {
    const { grants, search, statusFilter, agencyFilter, sortBy } = get();
    
    let filtered = (grants || []).filter(g => {
      const q = search.toLowerCase();
      
      const titleStr = g.title?.toLowerCase() || '';
      const agencyStr = g.agency?.toLowerCase() || '';
      const purposeStr = g.purpose?.toLowerCase() || '';
      
      const matchSearch = titleStr.includes(q) || agencyStr.includes(q) || purposeStr.includes(q);
      const matchStatus = statusFilter === 'All' || g.status === statusFilter;
      const matchAgency = agencyFilter === 'All' || g.agency === agencyFilter;
      
      return matchSearch && matchStatus && matchAgency;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.endDate || 0) - new Date(b.endDate || 0);
      }
      if (sortBy === 'amount') {
        let valA = a.amount;
        if (typeof a.amount === 'object' && a.amount !== null) valA = a.amount.raw !== undefined ? a.amount.raw : a.amount.value;
        
        let valB = b.amount;
        if (typeof b.amount === 'object' && b.amount !== null) valB = b.amount.raw !== undefined ? b.amount.raw : b.amount.value;
        
        const amtA = Number(valA) || 0;
        const amtB = Number(valB) || 0;
        return amtB - amtA; // Descending
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

    return filtered;
  }
}));

export default useGrantStore;
