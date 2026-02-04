import { useProcurement } from '../../context/ProcurementContext';
import { FileText, Clock, CheckCircle, XCircle, Package, TrendingUp, AlertCircle, FilePlus } from 'lucide-react';
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
} from '@mui/material';

export function FacultyStaffDashboard() {
  const { requisitions, currentUser } = useProcurement();
  
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
          Welcome, {currentUser.name.split(' ')[1]}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's an overview of your requisition requests
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
                Pending Approval
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
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F' }}>
                  <XCircle size={24} />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {stats.rejected}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
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
                All requisitions (excl. rejected)
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
                  Avg. Processing Time
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
                3-5 days
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Standard requisitions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AlertCircle size={24} color="#666" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Action Required
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Awaiting approvals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
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
              return (
                <Box key={req.id}>
                  <ListItem sx={{ py: 2.5, '&:hover': { bgcolor: 'action.hover' } }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
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
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="textSecondary">
                            {req.items.length} item(s) • {req.workflowType.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {req.requestedDate}
                          </Typography>
                        </Stack>
                      }
                    />
                    <Box sx={{ textAlign: 'right', ml: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ${req.totalEstimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {req.priority.toUpperCase()} Priority
                      </Typography>
                    </Box>
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
