import { createContext, useContext } from 'react';

const ProcurementContext = createContext();

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) {
    throw new Error('useProcurement must be used within ProcurementProvider');
  }
  return context;
};

export const ProcurementProvider = ({ children }) => {
  // Mock data for testing
  const mockRequisitions = [
    {
      id: 'RQ-001',
      status: 'pending_hod',
      totalEstimatedValue: 5000,
      items: [{ name: 'Lab Equipment', quantity: 2 }],
      workflowType: 'standard_requisition',
      requestedDate: '2026-02-01',
      priority: 'high'
    },
    {
      id: 'RQ-002',
      status: 'hod_approved',
      totalEstimatedValue: 8500,
      items: [{ name: 'Stationery', quantity: 100 }],
      workflowType: 'standard_requisition',
      requestedDate: '2026-01-28',
      priority: 'medium'
    },
    {
      id: 'RQ-003',
      status: 'quotation_received',
      totalEstimatedValue: 15000,
      items: [{ name: 'Computer Hardware', quantity: 5 }],
      workflowType: 'open_advertisement',
      requestedDate: '2026-01-25',
      priority: 'high'
    },
    {
      id: 'RQ-004',
      status: 'po_generated',
      totalEstimatedValue: 12000,
      items: [{ name: 'Office Furniture', quantity: 10 }],
      workflowType: 'standard_requisition',
      requestedDate: '2026-01-20',
      priority: 'low'
    },
    {
      id: 'RQ-005',
      status: 'hod_rejected',
      totalEstimatedValue: 3000,
      items: [{ name: 'Books', quantity: 50 }],
      workflowType: 'standard_requisition',
      requestedDate: '2026-01-15',
      priority: 'medium'
    }
  ];

  const mockCurrentUser = {
    id: 'user-001',
    name: 'John Doe',
    role: 'Faculty Staff',
    email: 'john.doe@university.edu'
  };

  const value = {
    requisitions: mockRequisitions,
    currentUser: mockCurrentUser
  };

  return (
    <ProcurementContext.Provider value={value}>
      {children}
    </ProcurementContext.Provider>
  );
};
