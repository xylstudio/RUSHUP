"use client";
import Link from 'next/link'
import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { 
  ClockIcon, 
  MapPinIcon, 
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from '@/lib/I18nContext'
import { appCopy, assignmentStatusLabel, pickLocalizedText } from '@/lib/appLocale'
import { normalizeAssignmentStatus } from '@/lib/serviceFlow'
import { formatCurrencyByLocale, formatDateByLocale } from '@/lib/localeFormat'

interface JobAssignment {
  id: string;
  order_id: string;
  staff_id: string;
  assigned_date: string;
  status: string;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceOrder {
  id: string;
  customer_id: string;
  house_id: string;
  service_id: string;
  price_template_id: string;
  order_code: string;
  service_area: number;
  base_price: number;
  calculated_price: number;
  total: number;
  total_price?: number;
  status: string;
  scheduled_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  service_name?: string;
  name?: string;
  description: string;
  estimated_duration?: number;
}

interface Customer {
  id: string;
  display_name?: string;
  email: string;
}

interface House {
  id: string;
  name: string;
  address: string;
}

interface TaskDetail {
  assignment: JobAssignment;
  order: ServiceOrder;
  service: Service;
  customer: Customer;
  house: House;
}

export default function StaffTasks() {
  const { locale } = useI18n()
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  const fetchTasks = useCallback(async () => {
    try {
      if (!supabase) throw new Error(pickLocalizedText(locale, appCopy.staffTasks.dbUnavailable));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(pickLocalizedText(locale, appCopy.staffTasks.missingUser));

      const { data: assignments, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('*')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      if (!assignments || assignments.length === 0) {
        setTasks([]);
        return;
      }

      const orderIds = assignments.map(a => a.order_id);
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (orderError) throw orderError;

      const serviceIds = orders?.map(o => o.service_id).filter(Boolean) || [];
      const { data: services, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .in('id', serviceIds);

      if (serviceError) throw serviceError;

      const customerIds = orders?.map(o => o.customer_id).filter(Boolean) || [];
      const { data: customers, error: customerError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', customerIds);

      if (customerError) throw customerError;

      const houseIds = orders?.map(o => o.house_id).filter(Boolean) || [];
      const { data: houses, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .in('id', houseIds);

      if (houseError) throw houseError;

      const taskDetails: TaskDetail[] = assignments.map(assignment => {
        const order = orders?.find(o => o.id === assignment.order_id);
        const service = services?.find(s => s.id === order?.service_id);
        const customer = customers?.find(c => c.id === order?.customer_id);
        const house = houses?.find(h => h.id === order?.house_id);

        return {
          assignment,
          order: order!,
          service: service!,
          customer: customer!,
          house: house!
        };
      }).filter(task => task.order && task.service && task.customer && task.house);

      setTasks(taskDetails);
    } catch (err: unknown) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : pickLocalizedText(locale, appCopy.staffTasks.loadError));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchTasks();

    if (!supabase) return;
    
    const subscription = supabase
      .channel('job-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchTasks]);

  const getStatusConfig = (status: string) => {
    const norm = normalizeAssignmentStatus(status)
    switch (norm) {
      case 'assigned':
        return { 
          label: pickLocalizedText(locale, appCopy.staffTasks.pending), 
          color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
          dot: 'bg-yellow-400',
          icon: <ExclamationTriangleIcon className="h-3 w-3" />
        };
      case 'accepted':
        return { 
          label: assignmentStatusLabel(locale, 'accepted'), 
          color: 'bg-blue-50 text-blue-700 border-blue-100',
          dot: 'bg-blue-400',
          icon: <ClockIcon className="h-3 w-3" />
        };
      case 'in_progress':
        return { 
          label: pickLocalizedText(locale, appCopy.staffTasks.inProgress), 
          color: 'bg-[#1A3626] text-white border-[#1A3626]',
          dot: 'bg-white',
          icon: <PlayIcon className="h-3 w-3" />
        };
      case 'completed':
        return { 
          label: pickLocalizedText(locale, appCopy.staffTasks.completed), 
          color: 'bg-[#F1F5F2] text-[#1A3626] border-[#D1DFD6]',
          dot: 'bg-[#1A3626]',
          icon: <CheckCircleIcon className="h-3 w-3" />
        };
      case 'declined':
        return { 
          label: pickLocalizedText(locale, appCopy.staffTasks.cancelled), 
          color: 'bg-red-50 text-red-700 border-red-100',
          dot: 'bg-red-400',
          icon: <XMarkIcon className="h-3 w-3" />
        };
      default:
        return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-100', dot: 'bg-gray-400', icon: null };
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    const norm = normalizeAssignmentStatus(task.assignment.status)
    if (filter === 'pending') return norm === 'assigned' || norm === 'accepted'
    return norm === filter;
  });

  const filterOptions = [
    { key: 'all', label: pickLocalizedText(locale, appCopy.staffTasks.all), count: tasks.length },
    { key: 'pending', label: pickLocalizedText(locale, appCopy.staffTasks.pending), count: tasks.filter(t => ['assigned', 'accepted'].includes(normalizeAssignmentStatus(t.assignment.status))).length },
    { key: 'in_progress', label: pickLocalizedText(locale, appCopy.staffTasks.inProgress), count: tasks.filter(t => normalizeAssignmentStatus(t.assignment.status) === 'in_progress').length },
    { key: 'completed', label: pickLocalizedText(locale, appCopy.staffTasks.completed), count: tasks.filter(t => normalizeAssignmentStatus(t.assignment.status) === 'completed').length },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] px-5 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-gray-100 rounded-full animate-pulse" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-24 bg-gray-100 rounded-full animate-pulse shrink-0" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 w-full bg-white rounded-[32px] border border-[#F0EFEB] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      {/* Editorial Header */}
      <div className="bg-white border-b border-[#F0EFEB] sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#AF907A] block mb-2">
            Staff Portal
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            {pickLocalizedText(locale, appCopy.staffTasks.title)}
          </h1>
          
          {/* Scrollable Pills Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-6 -mx-1 px-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
                  filter === opt.key 
                    ? 'bg-[#1A3626] text-white border-[#1A3626] shadow-lg shadow-[#1A3626]/20' 
                    : 'bg-white text-gray-400 border-[#F0EFEB] hover:border-gray-300'
                }`}
              >
                {opt.label} <span className={`ml-1 opacity-50 ${filter === opt.key ? 'text-white/60' : 'text-gray-300'}`}>{opt.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 pb-24">
        {error ? (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] text-center">
             <p className="text-red-700 font-bold mb-4">{error}</p>
             <button onClick={fetchTasks} className="px-6 py-2.5 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest">
               {pickLocalizedText(locale, appCopy.staffTasks.retry)}
             </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                <FunnelIcon className="h-8 w-8" />
             </div>
             <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
                {filter === "all" ? pickLocalizedText(locale, appCopy.staffTasks.noAssignedTasks) : 'No matching tasks'}
             </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, idx) => {
                const serviceName = task.service?.service_name || task.service?.name || pickLocalizedText(locale, appCopy.staffTasks.unspecifiedService);
                const customerName = task.customer?.display_name || task.customer?.email || pickLocalizedText(locale, appCopy.staffTasks.unspecifiedCustomer);
                const houseName = task.house?.name || pickLocalizedText(locale, appCopy.staffTasks.unspecifiedLocation);
                const serviceDate = task.order.scheduled_date
                  ? formatDateByLocale(task.order.scheduled_date, locale)
                  : pickLocalizedText(locale, appCopy.staffTasks.unscheduled);
                const status = getStatusConfig(task.assignment.status);

                return (
                  <motion.div
                    key={task.assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    layout
                  >
                    <Link 
                      href={`/dashboard/staff/tasks/${task.assignment.id}`}
                      className="block group bg-white border border-[#F0EFEB] rounded-[32px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-start justify-between mb-6">
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-bold uppercase tracking-widest text-[#AF907A]">
                                 {pickLocalizedText(locale, appCopy.staffTasks.orderCode)} {task.order.order_code}
                               </span>
                            </div>
                            <h3 className="text-xl font-bold tracking-tight text-[#111111] group-hover:text-[#1A3626] transition-colors">
                               {serviceName}
                            </h3>
                         </div>
                         <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAFAF8] border border-[#F0EFEB] flex items-center justify-center text-[#AF907A]">
                               <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Customer</p>
                               <p className="text-[13px] font-bold truncate">{customerName}</p>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAFAF8] border border-[#F0EFEB] flex items-center justify-center text-[#AF907A]">
                               <MapPinIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Location</p>
                               <p className="text-[13px] font-bold truncate">{houseName}</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAFAF8] border border-[#F0EFEB] flex items-center justify-center text-[#AF907A]">
                               <CalendarIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Scheduled</p>
                               <p className="text-[13px] font-bold truncate">{serviceDate}</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAFAF8] border border-[#F0EFEB] flex items-center justify-center text-[#AF907A]">
                               <ClockIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Price / Estimated</p>
                               <p className="text-[13px] font-bold truncate">{formatCurrencyByLocale(task.order.total_price ?? task.order.total ?? 0, locale)}</p>
                            </div>
                         </div>
                      </div>

                      <div className="pt-6 border-t border-[#F0EFEB] flex items-center justify-between">
                         <div className="flex -space-x-2 overflow-hidden">
                            {/* Avatar placeholder for team or just staff icon */}
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#1A3626] flex items-center justify-center">
                               <UserIcon className="h-3 w-3 text-white" />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 text-[#1A3626]">
                            <span className="text-[10px] font-bold uppercase tracking-widest">Open Field Journal</span>
                            <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                         </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* CSS Overrides for hidden scrollbars */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}