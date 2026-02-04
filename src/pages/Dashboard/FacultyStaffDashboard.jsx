import React from 'react';
import { useProcurement } from '../../context/ProcurementContext';
import { FileText, Clock, CheckCircle, XCircle, Package, TrendingUp, AlertCircle, FilePlus, Bell, Edit, Send, ThumbsUp, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  LinearProgress,
  Badge,
  Tab,
  Tabs,
} from '@mui/material';

export function FacultyStaffDashboard() {
  const { requisitions, currentUser } = useProcurement();
  const [tabValue, setTabValue] = React.useState(0);
  
  const stats = {
    total: requisitions.length,
    pending: requisitions.filter(r => 
      r.status === 'pending_hod' || 
      r.status === 'pending_dean' || 
      r.status === 'pending_finance' ||
      r.status === 'cfq_process'
    ).length,
    approved: requisitions.filter(r => 
      r.status === 'quotation_received' || 
      r.status === 'po_generated' ||
      r.status === 'completed'
    ).length,
    rejected: requisitions.filter(r => 
      r.status === 'hod_rejected' || 
      r.status === 'dean_rejected' || 
      r.status === 'finance_rejected'
    ).length,
  };
  
  // Workflow counts with progress status
  const workflowCounts = {
    standard: {
      inProgress: requisitions.filter(r => r.workflowType === 'standard_requisition' && r.status !== 'completed').length,
      completed: requisitions.filter(r => r.workflowType === 'standard_requisition' && r.status === 'completed').length,
      avgTime: '3-5 days'
    },
    open: {
      inProgress: requisitions.filter(r => r.workflowType === 'open_advertisement' && r.status !== 'completed').length,
      completed: requisitions.filter(r => r.workflowType === 'open_advertisement' && r.status === 'completed').length,
      avgTime: '7-10 days'
    },
    national: {
      inProgress: requisitions.filter(r => r.workflowType === 'national_bidding' && r.status !== 'completed').length,
      completed: requisitions.filter(r => r.workflowType === 'national_bidding' && r.status === 'completed').length,
      avgTime: '15-20 days'
    },
  };
  
  // Pending quotations - awaiting faculty review
  const pendingQuotations = requisitions.filter(r => r.status === 'quotation_received');
  
  // Notifications/Alerts
  const alerts = [
    ...requisitions.filter(r => r.status === 'hod_rejected').map(r => ({
      id: r.id,
      type: 'rejection',
      message: `HOD rejected request ${r.id}`,
      action: 'Resubmit',
      severity: 'error'
    })),
    ...requisitions.filter(r => r.status === 'dean_rejected').map(r => ({
      id: r.id,
      type: 'rejection',
      message: `Dean rejected request ${r.id}`,
      action: 'Resubmit',
      severity: 'error'
    })),
    ...requisitions.filter(r => r.status === 'finance_rejected').map(r => ({
      id: r.id,
      type: 'rejection',
      message: `Finance rejected request ${r.id}`,
      action: 'Clarify',
      severity: 'error'
    })),
    ...requisitions.filter(r => r.status === 'quotation_received').map(r => ({
      id: r.id,
      type: 'quotation',
      message: `Quotations received for ${r.id} - awaiting your review`,
      action: 'Review',
      severity: 'warning'
    })),
    ...requisitions.filter(r => r.status === 'po_generated').map(r => ({
      id: r.id,
      type: 'po',
      message: `Purchase Order generated for ${r.id}`,
      action: 'View',
      severity: 'success'
    })),
  ];
  
  // Active requests with workflow progress
  const activeRequests = requisitions.filter(r => r.status !== 'completed' && r.status !== 'hod_rejected' && r.status !== 'dean_rejected' && r.status !== 'finance_rejected');
  
  const getWorkflowProgress = (status) => {
    const progressMap = {
      'pending_hod': { step: 1, total: 6, label: 'At HOD Approval', percent: 17 },
      'hod_approved': { step: 2, total: 6, label: 'HOD Approved', percent: 33 },
      'pending_dean': { step: 2, total: 6, label: 'At Dean Approval', percent: 33 },
      'dean_approved': { step: 3, total: 6, label: 'Dean Approved', percent: 50 },
      'pending_finance': { step: 3, total: 6, label: 'At Finance Approval', percent: 50 },
      'finance_approved': { step: 4, total: 6, label: 'Finance Approved', percent: 67 },
      'cfq_process': { step: 5, total: 6, label: 'Quotation Process', percent: 83 },
      'quotation_received': { step: 5, total: 6, label: 'Quotations Received', percent: 83 },
      'po_generated': { step: 6, total: 6, label: 'PO Generated', percent: 100 },
    };
    return progressMap[status] || { step: 0, total: 6, label: status, percent: 0 };
  };
  
  const totalValue = requisitions
    .filter(r => r.status !== 'hod_rejected' && r.status !== 'dean_rejected' && r.status !== 'finance_rejected')
    .reduce((sum, r) => sum + r.totalEstimatedValue, 0);
  
  const recentRequisitions = requisitions.slice(0, 5);
  
  const getStatusInfo = (status) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText };
      case 'pending_hod':
        return { label: 'Pending HOD Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'hod_approved':
        return { label: 'HOD Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'hod_rejected':
        return { label: 'HOD Rejected', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'pending_dean':
        return { label: 'Pending Dean Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'dean_approved':
        return { label: 'Dean Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'dean_rejected':
        return { label: 'Dean Rejected', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'pending_finance':
        return { label: 'Pending Finance Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'finance_approved':
        return { label: 'Finance Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'finance_rejected':
        return { label: 'Finance Rejected', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'cfq_process':
        return { label: 'Quotation Process', color: 'bg-purple-100 text-purple-700', icon: FileText };
      case 'quotation_received':
        return { label: 'Quotations Received', color: 'bg-indigo-100 text-indigo-700', icon: FileText };
      case 'po_generated':
        return { label: 'PO Generated', color: 'bg-green-100 text-green-700', icon: Package };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: FileText };
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Welcome, {currentUser.name} — {currentUser.role}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's an overview of your requisition requests and available procurement workflows
        </Typography>
      </Box>
      
      {/* Quick Action */}
      <Box sx={{ mb: 4 }}>
        <Button
          component={Link}
          to="/create-requisition"
          variant="contained"
          color="primary"
          startIcon={<FilePlus size={20} />}
          sx={{ textTransform: 'none', fontSize: '1rem', py: 1, px: 3 }}
        >
          Create New Requisition
        </Button>
      </Box>
      
      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1976D2' }}>
                  <FileText size={24} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Requisitions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F57C00' }}>
                  <Clock size={24} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#388E3C' }}>
                  <CheckCircle size={24} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F' }}>
                  <AlertCircle size={24} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {alerts.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Actions Needed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Notifications/Alerts Panel */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 4, border: '1px solid #FFEBEE', bgcolor: '#FFFBFB' }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={alerts.length} color="error">
              <Bell size={20} color="#D32F2F" />
            </Badge>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications & Alerts
            </Typography>
          </Box>
          <List sx={{ width: '100%' }}>
            {alerts.slice(0, 5).map((alert, idx) => (
              <Box key={idx}>
                <ListItem sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {alert.message}
                        </Typography>
                        <Chip
                          label={alert.severity === 'error' ? 'Critical' : alert.severity === 'warning' ? 'Pending' : 'Completed'}
                          size="small"
                          sx={{
                            bgcolor: alert.severity === 'error' ? '#FFEBEE' : alert.severity === 'warning' ? '#FFF3E0' : '#E8F5E9',
                            color: alert.severity === 'error' ? '#C62828' : alert.severity === 'warning' ? '#E65100' : '#2E7D32'
                          }}
                        />
                      </Stack>
                    }
                  />
                  <Button size="small" color="primary" sx={{ ml: 1, textTransform: 'none' }}>
                    {alert.action}
                  </Button>
                </ListItem>
                {idx < Math.min(4, alerts.length - 1) && <Divider />}
              </Box>
            ))}
          </List>
          {alerts.length > 5 && (
            <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: '#F5F5F5' }}>
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                View all {alerts.length} alerts →
              </Typography>
            </Box>
          )}
        </Card>
      )}
      
      {/* Value Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(to right, #1976D2, #1565C0)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TrendingUp size={24} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total Estimated Value
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                All active requisitions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Clock size={24} color="#666" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Pending Review
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
                {pendingQuotations.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Quotations awaiting your action
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <RefreshCw size={24} color="#666" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  In Pipeline
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
                {activeRequests.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active requisitions in workflow
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Procurement Workflows */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Procurement Workflows
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <FileText size={22} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Workflow 1 — Standard</Typography>
                    <Typography variant="caption" color="textSecondary">Staff → HOD → Dean → Finance → PO</Typography>
                  </Box>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2"><strong>{workflowCounts.standard.inProgress}</strong> In Progress</Typography>
                  <Typography variant="body2" color="textSecondary"><strong>{workflowCounts.standard.completed}</strong> Completed</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>Est. Time: {workflowCounts.standard.avgTime}</Typography>
                <Button component={Link} to="/create-requisition" fullWidth size="small" variant="outlined" sx={{ textTransform: 'none' }}>Start Requisition</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <FilePlus size={22} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Workflow 2 — Open Ad</Typography>
                    <Typography variant="caption" color="textSecondary">Public → Bidding → Evaluation → PO</Typography>
                  </Box>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2"><strong>{workflowCounts.open.inProgress}</strong> In Progress</Typography>
                  <Typography variant="body2" color="textSecondary"><strong>{workflowCounts.open.completed}</strong> Completed</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>Est. Time: {workflowCounts.open.avgTime}</Typography>
                <Button component={Link} to="/create-requisition?type=open_advertisement" fullWidth size="small" variant="outlined" sx={{ textTransform: 'none' }}>Request Quote</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Package size={22} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Workflow 3 — National</Typography>
                    <Typography variant="caption" color="textSecondary">National Ad → Tender → Eval → PO</Typography>
                  </Box>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2"><strong>{workflowCounts.national.inProgress}</strong> In Progress</Typography>
                  <Typography variant="body2" color="textSecondary"><strong>{workflowCounts.national.completed}</strong> Completed</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>Est. Time: {workflowCounts.national.avgTime}</Typography>
                <Button component={Link} to="/create-requisition?type=national_bidding" fullWidth size="small" variant="outlined" sx={{ textTransform: 'none' }}>Initiate Tender</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Bidding/Quotations Section */}
      {pendingQuotations.length > 0 && (
        <Card sx={{ mb: 4, borderTop: '3px solid #1976D2' }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FileText size={22} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Pending Quotations ({pendingQuotations.length})
              </Typography>
            </Stack>
            <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
              Review All →
            </Typography>
          </Box>
          <List sx={{ width: '100%' }}>
            {pendingQuotations.slice(0, 3).map((req, idx) => (
              <Box key={req.id}>
                <ListItem sx={{ py: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                  <ListItemText
                    primary={
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {req.id}
                          </Typography>
                          <Chip label={`${req.items.length} items`} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="textSecondary">
                          {req.workflowType.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                      </Stack>
                    }
                  />
                  <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                    <Button size="small" color="primary" startIcon={<Eye size={16} />} sx={{ textTransform: 'none' }}>Review</Button>
                    <Button size="small" color="success" startIcon={<ThumbsUp size={16} />} sx={{ textTransform: 'none' }}>Accept</Button>
                  </Stack>
                </ListItem>
                {idx < Math.min(2, pendingQuotations.length - 1) && <Divider />}
              </Box>
            ))}
          </List>
        </Card>
      )}

      {/* Active Requests Status Tracker */}
      {activeRequests.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              My Active Requests Status
            </Typography>
          </Box>
          <List sx={{ width: '100%' }}>
            {activeRequests.slice(0, 4).map((req, idx) => {
              const progress = getWorkflowProgress(req.status);
              return (
                <Box key={req.id}>
                  <ListItem sx={{ py: 2.5 }}>
                    <ListItemText
                      primary={
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: '70px' }}>
                              {req.id}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {progress.label}
                            </Typography>
                            <Chip label={`${progress.percent}%`} size="small" variant="outlined" />
                          </Stack>
                          <Box>
                            <LinearProgress variant="determinate" value={progress.percent} sx={{ mb: 0.5 }} />
                            <Typography variant="caption" color="textSecondary">
                              Step {progress.step} of {progress.total} • ${req.totalEstimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {idx < Math.min(3, activeRequests.length - 1) && <Divider />}
                </Box>
              );
            })}
          </List>
        </Card>
      )}

      {/* Smart Actions Panel */}
      {(requisitions.filter(r => r.status.includes('rejected')).length > 0 || pendingQuotations.length > 0) && (
        <Card sx={{ mb: 4, bgcolor: '#F0F7FF', borderLeft: '4px solid #1976D2' }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Send size={20} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
            </Stack>
          </Box>
          <CardContent>
            <Grid container spacing={2}>
              {requisitions.filter(r => r.status.includes('rejected')).length > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    startIcon={<RefreshCw size={18} />}
                    variant="contained"
                    color="warning"
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Resubmit Rejected</Typography>
                      <Typography variant="caption">{requisitions.filter(r => r.status.includes('rejected')).length} request(s)</Typography>
                    </Box>
                  </Button>
                </Grid>
              )}
              {pendingQuotations.length > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    startIcon={<Eye size={18} />}
                    variant="contained"
                    color="primary"
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Review Quotations</Typography>
                      <Typography variant="caption">{pendingQuotations.length} quotation(s)</Typography>
                    </Box>
                  </Button>
                </Grid>
              )}
              {stats.pending > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    startIcon={<Edit size={18} />}
                    variant="contained"
                    sx={{ textTransform: 'none', justifyContent: 'flex-start', bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Respond to Queries</Typography>
                      <Typography variant="caption">{stats.pending} awaiting input</Typography>
                    </Box>
                  </Button>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Requisitions */}
      <Card>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recent Requisitions
          </Typography>
          <Button
            component={Link}
            to="/my-requisitions"
            color="primary"
            sx={{ textTransform: 'none' }}
          >
            View All →
          </Button>
        </Box>
        
        {recentRequisitions.length > 0 ? (
          <List sx={{ width: '100%' }}>
            {recentRequisitions.map((req, index) => {
              const statusInfo = getStatusInfo(req.status);
              const progress = getWorkflowProgress(req.status);
              return (
                <Box key={req.id}>
                  <ListItem sx={{ py: 2.5, '&:hover': { bgcolor: 'action.hover' }, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Stack sx={{ width: '100%' }} spacing={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {req.id}
                        </Typography>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          variant="filled"
                          sx={{
                            bgcolor: statusInfo.color.includes('bg-yellow') ? '#FFF3E0' : 
                                     statusInfo.color.includes('bg-red') ? '#FFEBEE' :
                                     statusInfo.color.includes('bg-blue') ? '#E3F2FD' :
                                     statusInfo.color.includes('bg-green') ? '#E8F5E9' :
                                     statusInfo.color.includes('bg-purple') ? '#F3E5F5' : '#F5F5F5',
                            color: statusInfo.color.includes('bg-yellow') ? '#E65100' :
                                   statusInfo.color.includes('bg-red') ? '#C62828' :
                                   statusInfo.color.includes('bg-blue') ? '#1565C0' :
                                   statusInfo.color.includes('bg-green') ? '#2E7D32' :
                                   statusInfo.color.includes('bg-purple') ? '#7B1FA2' : '#666'
                          }}
                        />
                        <Typography variant="caption" color="primary" sx={{ ml: 'auto' }}>
                          {progress.label}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="textSecondary">
                        {req.items.length} item(s) • {req.workflowType.replace(/_/g, ' ').toUpperCase()} • ${req.totalEstimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          {req.requestedDate} • {req.priority.toUpperCase()} Priority
                        </Typography>
                        {req.status.includes('rejected') && (
                          <Button size="small" color="warning" startIcon={<RefreshCw size={14} />} sx={{ textTransform: 'none' }}>Resubmit</Button>
                        )}
                      </Box>
                    </Stack>
                  </ListItem>
                  {index < recentRequisitions.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <FileText size={48} style={{ margin: '0 auto 12px', color: '#ccc' }} />
            <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
              No requisitions yet
            </Typography>
            <Button
              component={Link}
              to="/create-requisition"
              color="primary"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Create your first requisition →
            </Button>
          </Box>
        )}
      </Card>
    </Container>
  );
}
