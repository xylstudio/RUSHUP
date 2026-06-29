import { Search, Calendar, MapPin, Plane, Building2, CarFront, Ticket, UtensilsCrossed } from 'lucide-react';
import { motion } from 'framer-motion';

export function BookingWidget() {
  const services = [
    { id: 'hotel', icon: Building2, label: 'ที่พัก', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'flight', icon: Plane, label: 'เที่ยวบิน', color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'car', icon: CarFront, label: 'รถเช่า', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'activity', icon: Ticket, label: 'กิจกรรม', color: 'text-violet-500', bg: 'bg-violet-50' },
    { id: 'food', icon: UtensilsCrossed, label: 'กินดื่ม', color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  return (
null
  );
}
