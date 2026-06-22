import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import {
  MapPin, ArrowRight, Ticket, Menu, X, ChevronLeft, ChevronRight,
  Clock, Calendar, Users, Star, Play, Download,
  CheckCircle, AlertCircle, Eye, EyeOff, Mail, User,
  LayoutDashboard, FileText, ShoppingCart, UserCheck, Upload, Zap,
  Settings, LogOut, Search, Filter, Plus, Edit, Trash2, MoreVertical,
  TrendingUp, DollarSign, BarChart3, FileSpreadsheet, Brain, QrCode,
  Wifi, WifiOff, History, ScanLine, Home, RefreshCw, Camera, XCircle,
  Smartphone, Sparkles, Lock, Database, Phone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ZoneInfo = { id: string; name: string; price: number; color: string; available: number; type: string };
type PageState =
  | { page: "home" }
  | { page: "event-detail"; eventId: number }
  | { page: "seat-map"; eventId: number }
  | { page: "checkout"; eventId: number; zone: ZoneInfo; qty: number }
  | { page: "eticket"; eventId: number; zone: ZoneInfo; qty: number; holderName: string }
  | { page: "admin-dashboard" }
  | { page: "admin-concerts" }
  | { page: "admin-orders" }
  | { page: "admin-tickets" }
  | { page: "admin-users" }
  | { page: "admin-guests" }
  | { page: "admin-ai-bio" }
  | { page: "admin-checkin" }
  | { page: "staff-login" }
  | { page: "staff-event-select" }
  | { page: "staff-sync"; eventId: number }
  | { page: "staff-scanner"; eventId: number }
  | { page: "staff-history"; eventId: number }
  | { page: "staff-settings"; eventId: number }
  | { page: "my-tickets" }
  | { page: "account-settings" }
  | { page: "search-results"; query: string };

// ─── Data ────────────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    id: 1, eventId: 1,
    name: "ANH TRAI SAY HI",
    subtitle: "ATSH CONCERT 2026 — ĐÊM DIỄN CUỐI NĂM",
    artists: "HIEUTHUHAI · Quân A.P · Rhyder · Erik · Isaac · Negav",
    date: "14 THG 6, 2026", time: "18:00",
    venue: "Sân Vận Động Mỹ Đình", city: "Hà Nội",
    price: "800.000",
    image: "https://images.unsplash.com/photo-1566477712363-3c75dd39b416?w=1800&h=900&fit=crop&auto=format&q=80",
    accentColor: "#FF2D20", tag: "SOLD OUT NHANH",
  },
  {
    id: 2, eventId: 2,
    name: "ANH TRAI VƯỢT NGÀN CHÔNG GAI",
    subtitle: "THE GRAND FINALE — HÀNH TRÌNH KHÉP LẠI",
    artists: "Sơn Tùng M-TP · Noo Phước Thịnh · Đức Phúc · Dương Triệu Vũ",
    date: "22 THG 6, 2026", time: "19:00",
    venue: "Nhà Thi Đấu Quân Khu 7", city: "TP. Hồ Chí Minh",
    price: "600.000",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1800&h=900&fit=crop&auto=format&q=80",
    accentColor: "#CCFF00", tag: "HOT",
  },
  {
    id: 3, eventId: 5,
    name: "CHỊ ĐẸP ĐẠP GIÓ RẼ SÓNG",
    subtitle: "GRAND TOUR 2026 — QUYỀN LỰC TRÊN SÂN KHẤU",
    artists: "Hồ Ngọc Hà · Thu Minh · Mỹ Linh · Uyên Linh · Tóc Tiên",
    date: "12 THG 7, 2026", time: "19:30",
    venue: "Cung Thể Thao Quần Ngựa", city: "Hà Nội",
    price: "750.000",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1800&h=900&fit=crop&auto=format&q=80",
    accentColor: "#C084FC", tag: "GẦN HẾT VÉ",
  },
  {
    id: 4, eventId: 3,
    name: "EM XINH SAY HI",
    subtitle: "DEBUT CONCERT — LẦN ĐẦU TIÊN TRÊN SÂN KHẤU LỚN",
    artists: "Wren Evans · Tage · Lena · Phúc Du · Tăng Duy Tân",
    date: "05 THG 7, 2026", time: "20:00",
    venue: "GEM Center", city: "TP. Hồ Chí Minh",
    price: "450.000",
    image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=1800&h=900&fit=crop&auto=format&q=80",
    accentColor: "#38BDF8", tag: "MỚI MỞ BÁN",
  },
  {
    id: 5, eventId: 6,
    name: "AFTERPARTY EDM FESTIVAL",
    subtitle: "INTERNATIONAL NIGHT — DJ SNAKE & MORE",
    artists: "DJ Snake · Lost Frequencies · KSHMR · Alesso",
    date: "02 THG 8, 2026", time: "21:00",
    venue: "SECC", city: "TP. Hồ Chí Minh",
    price: "1.200.000",
    image: "https://images.unsplash.com/photo-1599739291127-15c456e459ee?w=1800&h=900&fit=crop&auto=format&q=80",
    accentColor: "#CCFF00", tag: "QUỐC TẾ",
  },
];

const CATEGORIES = ["Tất cả", "Nhạc Pop", "R&B / Soul", "Rap / Hip-Hop", "Rock", "EDM", "Comedy", "Classical"];

const EVENTS = [
  {
    id: 1, name: "ANH TRAI SAY HI", subtitle: "ATSH Concert 2026",
    artist: "HIEUTHUHAI, Quân A.P, Rhyder, Erik, Isaac",
    date: "14 THG 6, 2026", time: "18:00", venue: "Sân Vận Động Mỹ Đình", city: "Hà Nội",
    price: "800.000", category: "Nhạc Pop",
    image: "https://images.unsplash.com/photo-1566477712363-3c75dd39b416?w=800&h=600&fit=crop&auto=format",
    tag: "HOT", tagStyle: "bg-[#FF2D20] text-white", sold: 93, featured: true,
    description: "Đêm diễn cuối năm của chương trình Anh Trai Say Hi với sự tham gia của toàn bộ dàn nghệ sĩ. Khán giả sẽ được thưởng thức những màn trình diễn đỉnh cao, kết hợp âm nhạc sôi động và hình ảnh sân khấu hoành tráng.",
    artistList: [
      { name: "HIEUTHUHAI", role: "Nghệ sĩ chính" }, { name: "Quân A.P", role: "Nghệ sĩ chính" },
      { name: "Rhyder", role: "Khách mời" }, { name: "Erik", role: "Khách mời" },
      { name: "Isaac", role: "Khách mời" }, { name: "Negav", role: "Khách mời" },
    ],
  },
  {
    id: 2, name: "RAP VIỆT ALL-STARS", subtitle: "Concert Rap Lớn Nhất Năm",
    artist: "Binz, Đen Vâu, MCK, Obito, Tlinh",
    date: "22 THG 6, 2026", time: "18:00", venue: "Nhà Thi Đấu Quân Khu 7", city: "TP. Hồ Chí Minh",
    price: "500.000", category: "Rap / Hip-Hop",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=700&h=500&fit=crop&auto=format",
    tag: "MỚI MỞ BÁN", tagStyle: "bg-[#CCFF00] text-black", sold: 62, featured: false,
    description: "Tập hợp những cái tên đình đám nhất của làng rap Việt Nam trong một đêm nhạc không thể bỏ qua. Đây là lần đầu tiên các nghệ sĩ cùng đứng chung sân khấu.",
    artistList: [
      { name: "Binz", role: "Nghệ sĩ chính" }, { name: "Đen Vâu", role: "Nghệ sĩ chính" },
      { name: "MCK", role: "Nghệ sĩ chính" }, { name: "Obito", role: "Khách mời" },
      { name: "Tlinh", role: "Khách mời" },
    ],
  },
  {
    id: 3, name: "BINZ × TOULIVER LIVE", subtitle: "Live In Concert",
    artist: "Binz, Touliver",
    date: "05 THG 7, 2026", time: "20:00", venue: "GEM Center", city: "TP. Hồ Chí Minh",
    price: "650.000", category: "Rap / Hip-Hop",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&h=500&fit=crop&auto=format",
    tag: "GẦN HẾT VÉ", tagStyle: "bg-orange-500 text-white", sold: 94, featured: false,
    description: "Một đêm nhạc kết hợp rap và electronic độc đáo từ hai nghệ sĩ tài năng nhất Việt Nam. Âm nhạc live sẽ tạo ra một không gian trải nghiệm hoàn toàn khác biệt.",
    artistList: [{ name: "Binz", role: "Nghệ sĩ chính" }, { name: "Touliver", role: "Producer / DJ" }],
  },
  {
    id: 4, name: "ĐEN VÂU — TRỜI ƠI!", subtitle: "Đêm Nhạc Trực Tiếp",
    artist: "Đen Vâu",
    date: "12 THG 7, 2026", time: "19:00", venue: "Cung TT Quần Ngựa", city: "Hà Nội",
    price: "400.000", category: "Rap / Hip-Hop",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=700&h=500&fit=crop&auto=format",
    tag: null, tagStyle: "", sold: 45, featured: false,
    description: "Đen Vâu trở lại với đêm nhạc solo đầy cảm xúc tại Hà Nội, mang đến những ca khúc đã đồng hành cùng hàng triệu người nghe.",
    artistList: [{ name: "Đen Vâu", role: "Nghệ sĩ chính" }],
  },
  {
    id: 5, name: "MỸ TÂM TOUR 2026", subtitle: "Hoa Hồng Có Gai",
    artist: "Mỹ Tâm",
    date: "19 THG 7, 2026", time: "19:30", venue: "Nhà Hát Hòa Bình", city: "TP. Hồ Chí Minh",
    price: "850.000", category: "Nhạc Pop",
    image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=700&h=500&fit=crop&auto=format",
    tag: "VIP", tagStyle: "bg-purple-600 text-white", sold: 71, featured: false,
    description: "Mỹ Tâm trở lại với world tour đầy hoành tráng sau nhiều năm chờ đợi. Đêm diễn sẽ kể lại hành trình âm nhạc hơn 20 năm của người phụ nữ mạnh mẽ nhất Vpop.",
    artistList: [{ name: "Mỹ Tâm", role: "Nghệ sĩ chính" }],
  },
  {
    id: 6, name: "AFTERPARTY FESTIVAL", subtitle: "EDM & Electronic Night",
    artist: "DJ Snake, Lost Frequencies, KSHMR",
    date: "02 THG 8, 2026", time: "21:00", venue: "SECC", city: "TP. Hồ Chí Minh",
    price: "1.200.000", category: "EDM",
    image: "https://images.unsplash.com/photo-1565035010268-a3816f98589a?w=700&h=500&fit=crop&auto=format",
    tag: "QUỐC TẾ", tagStyle: "bg-blue-600 text-white", sold: 58, featured: false,
    description: "Festival EDM quốc tế lớn nhất từ trước đến nay tại Việt Nam. Bốn DJ hàng đầu thế giới sẽ cùng khuấy động Sài Gòn trong một đêm không ngủ.",
    artistList: [
      { name: "DJ Snake", role: "DJ chính" }, { name: "Lost Frequencies", role: "DJ chính" },
      { name: "KSHMR", role: "Khách mời" }, { name: "Alesso", role: "Khách mời" },
    ],
  },
  {
    id: 7, name: "MCK & OBITO", subtitle: "Anh Đã Ổn Hơn Concert",
    artist: "MCK, Obito",
    date: "26 THG 7, 2026", time: "19:30", venue: "TT Hội Nghị 8 Hoàng Diệu", city: "Đà Nẵng",
    price: "450.000", category: "Rap / Hip-Hop",
    image: "https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=700&h=500&fit=crop&auto=format",
    tag: null, tagStyle: "", sold: 33, featured: false,
    description: "MCK và Obito hội ngộ trong đêm concert đặc biệt tại Đà Nẵng, mang lại những khoảnh khắc âm nhạc chữa lành và đầy năng lượng.",
    artistList: [{ name: "MCK", role: "Nghệ sĩ chính" }, { name: "Obito", role: "Nghệ sĩ chính" }],
  },
  {
    id: 8, name: "MONO — WAITING FOR WINTER", subtitle: "First Solo Concert",
    artist: "MONO",
    date: "09 THG 8, 2026", time: "19:00", venue: "Nhà Hát Lớn Hà Nội", city: "Hà Nội",
    price: "600.000", category: "R&B / Soul",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=700&h=500&fit=crop&auto=format",
    tag: "MỚI", tagStyle: "bg-[#CCFF00] text-black", sold: 21, featured: false,
    description: "MONO ra mắt concert solo đầu tiên trong sự nghiệp tại một trong những sân khấu danh giá nhất Hà Nội. Một đêm nhạc R&B đầy cảm xúc.",
    artistList: [{ name: "MONO", role: "Nghệ sĩ chính" }],
  },
];

const ZONES: ZoneInfo[] = [
  { id: "sky",      name: "SKY LOUNGE",  price: 8000000, color: "#CCFF00", available: 45,  type: "Seating"  },
  { id: "svip-a",   name: "SVIP — A",    price: 5000000, color: "#FF2D20", available: 23,  type: "Seating"  },
  { id: "svip-b",   name: "SVIP — B",    price: 5000000, color: "#FF2D20", available: 31,  type: "Seating"  },
  { id: "vip-a",    name: "VIP — A",     price: 4000000, color: "#C084FC", available: 87,  type: "Seating"  },
  { id: "vip-b",    name: "VIP — B",     price: 4000000, color: "#C084FC", available: 94,  type: "Seating"  },
  { id: "fz-1a",    name: "FANZONE 1A",  price: 1200000, color: "#38BDF8", available: 312, type: "Standing" },
  { id: "fz-1b",    name: "FANZONE 1B",  price: 1200000, color: "#38BDF8", available: 289, type: "Standing" },
  { id: "fz-2a",    name: "FANZONE 2A",  price: 1000000, color: "#60A5FA", available: 421, type: "Standing" },
  { id: "fz-2b",    name: "FANZONE 2B",  price: 1000000, color: "#60A5FA", available: 398, type: "Standing" },
  { id: "cat1a",    name: "CAT 1A",      price: 1500000, color: "#F97316", available: 156, type: "Seating"  },
  { id: "cat1b",    name: "CAT 1B",      price: 1500000, color: "#F97316", available: 143, type: "Seating"  },
  { id: "cat2a",    name: "CAT 2A",      price: 1200000, color: "#FB923C", available: 234, type: "Seating"  },
  { id: "cat2b",    name: "CAT 2B",      price: 1200000, color: "#FB923C", available: 267, type: "Seating"  },
  { id: "ozone",    name: "OZONE",       price: 1500000, color: "#34D399", available: 89,  type: "Standing" },
];

const UPCOMING = [
  { name: "ANH TRAI SAY HI",    date: "14/06", city: "Hà Nội",   price: "800.000đ",   cat: "POP", id: 1 },
  { name: "RAP VIỆT ALL-STARS", date: "22/06", city: "TP.HCM",   price: "500.000đ",   cat: "RAP", id: 2 },
  { name: "BINZ × TOULIVER",    date: "05/07", city: "TP.HCM",   price: "650.000đ",   cat: "RAP", id: 3 },
  { name: "ĐEN VÂU — TRỜI ƠI!",date: "12/07", city: "Hà Nội",   price: "400.000đ",   cat: "RAP", id: 4 },
  { name: "MỸ TÂM TOUR 2026",   date: "19/07", city: "TP.HCM",   price: "850.000đ",   cat: "POP", id: 5 },
  { name: "MCK & OBITO",        date: "26/07", city: "Đà Nẵng",  price: "450.000đ",   cat: "RAP", id: 7 },
];

// ─── Admin Data ──────────────────────────────────────────────────────────────

const ADMIN_ORDERS = [
  { id: "ORD-001", event: "ANH TRAI SAY HI", user: "Nguyễn Văn A", zone: "SVIP — A", qty: 2, total: 10000000, status: "PAID", date: "2026-06-01" },
  { id: "ORD-002", event: "RAP VIỆT ALL-STARS", user: "Trần Thị B", zone: "VIP — A", qty: 4, total: 16000000, status: "PAID", date: "2026-06-02" },
  { id: "ORD-003", event: "BINZ × TOULIVER", user: "Lê Văn C", zone: "CAT 1A", qty: 3, total: 4500000, status: "PENDING", date: "2026-06-03" },
  { id: "ORD-004", event: "MỸ TÂM TOUR 2026", user: "Phạm Thị D", zone: "SKY LOUNGE", qty: 1, total: 8000000, status: "PAID", date: "2026-06-04" },
  { id: "ORD-005", event: "AFTERPARTY FESTIVAL", user: "Hoàng Văn E", zone: "FANZONE 1A", qty: 2, total: 2400000, status: "CANCELLED", date: "2026-06-05" },
];

const ADMIN_USERS = [
  { id: 1, name: "Admin User", email: "admin@viticket.vn", role: "ADMIN", created: "2025-01-01" },
  { id: 2, name: "Nguyễn Văn A", email: "nguyenvana@example.com", role: "AUDIENCE", created: "2026-05-15" },
  { id: 3, name: "Staff Soát Vé", email: "staff@viticket.vn", role: "STAFF", created: "2026-02-10" },
  { id: 4, name: "Trần Thị B", email: "tranthib@example.com", role: "AUDIENCE", created: "2026-05-20" },
];

const ADMIN_GUESTS = [
  { id: 1, concert: "ANH TRAI SAY HI", name: "VIP Guest 1", email: "vip1@sponsor.com", phone: "0901234567", checkedIn: true },
  { id: 2, concert: "ANH TRAI SAY HI", name: "VIP Guest 2", email: "vip2@sponsor.com", phone: "0901234568", checkedIn: false },
  { id: 3, concert: "MỸ TÂM TOUR 2026", name: "VIP Guest 3", email: "vip3@sponsor.com", phone: "0901234569", checkedIn: false },
];

const ADMIN_TICKETS = [
  { id: "TKT-001", orderId: "ORD-001", event: "ANH TRAI SAY HI", zone: "SVIP — A", holder: "Nguyễn Văn A", qrCode: "VT-A1B2C3", status: "UNUSED", checkInTime: null },
  { id: "TKT-002", orderId: "ORD-001", event: "ANH TRAI SAY HI", zone: "SVIP — A", holder: "Nguyễn Văn A", qrCode: "VT-D4E5F6", status: "UNUSED", checkInTime: null },
  { id: "TKT-003", orderId: "ORD-002", event: "RAP VIỆT ALL-STARS", zone: "VIP — A", holder: "Trần Thị B", qrCode: "VT-G7H8I9", status: "CHECKED_IN", checkInTime: "2026-06-22 18:30" },
  { id: "TKT-004", orderId: "ORD-002", event: "RAP VIỆT ALL-STARS", zone: "VIP — A", holder: "Trần Thị B", qrCode: "VT-J1K2L3", status: "CHECKED_IN", checkInTime: "2026-06-22 18:31" },
  { id: "TKT-005", orderId: "ORD-004", event: "MỸ TÂM TOUR 2026", zone: "SKY LOUNGE", holder: "Phạm Thị D", qrCode: "VT-M4N5O6", status: "UNUSED", checkInTime: null },
];

const USER_TICKETS = [
  { id: "TKT-Z001", event: "ANH TRAI SAY HI", subtitle: "ATSH Concert 2026", date: "14 THG 6, 2026", time: "18:00", venue: "Sân Vận Động Mỹ Đình", city: "Hà Nội", zone: "SVIP — A", holder: "Sỹ Văn", qr: "VT-A1B2C3", color: "#FF2D20", status: "upcoming" as const, seat: "A-12", orderId: "ORD-Z001", price: 5000000, eventId: 1 },
  { id: "TKT-Z002", event: "RAP VIỆT ALL-STARS", subtitle: "Concert Rap Lớn Nhất Năm", date: "22 THG 6, 2026", time: "18:00", venue: "Nhà Thi Đấu Quân Khu 7", city: "TP. Hồ Chí Minh", zone: "VIP — A", holder: "Sỹ Văn", qr: "VT-D4E5F6", color: "#CCFF00", status: "upcoming" as const, seat: "C-07", orderId: "ORD-Z001", price: 4000000, eventId: 2 },
  { id: "TKT-Z003", event: "MỸ TÂM TOUR 2026", subtitle: "Hoa Hồng Có Gai", date: "19 THG 7, 2026", time: "19:30", venue: "Nhà Hát Hòa Bình", city: "TP. Hồ Chí Minh", zone: "SKY LOUNGE", holder: "Sỹ Văn", qr: "VT-J1K2L3", color: "#CCFF00", status: "upcoming" as const, seat: "SKY-05", orderId: "ORD-Z002", price: 8000000, eventId: 5 },
  { id: "TKT-Z004", event: "BINZ × TOULIVER LIVE", subtitle: "Live In Concert — Đêm Cuối", date: "15 THG 11, 2025", time: "20:00", venue: "GEM Center", city: "TP. Hồ Chí Minh", zone: "CAT 1A", holder: "Sỹ Văn", qr: "VT-G7H8I9", color: "#C084FC", status: "used" as const, seat: "F-23", orderId: "ORD-Z003", price: 1500000, eventId: 3 },
  { id: "TKT-Z005", event: "AFTERPARTY EDM 2025", subtitle: "International Night — DJ Snake", date: "02 THG 8, 2025", time: "21:00", venue: "SECC", city: "TP. Hồ Chí Minh", zone: "FANZONE 1A", holder: "Sỹ Văn", qr: "VT-M4N5O6", color: "#38BDF8", status: "used" as const, seat: "GA", orderId: "ORD-Z003", price: 1200000, eventId: 6 },
];

type ScannedTicket = {
  qrCode: string;
  event: string;
  zone: string;
  holder: string;
  scannedAt: string;
  synced: boolean;
  status: "valid" | "duplicate" | "invalid";
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const D = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
function fmt(n: number) { return n.toLocaleString("vi-VN"); }

// Logo Component
function Logo({ variant = "dark", size = "md" }: { variant?: "dark" | "light"; size?: "sm" | "md" | "lg" }) {
  const fontSize = size === "sm" ? "text-xl" : size === "md" ? "text-2xl" : "text-3xl";
  const zSize = size === "sm" ? "text-[28px]" : size === "md" ? "text-[32px]" : "text-[40px]";
  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 20;
  const color = variant === "dark" ? "text-white" : "text-gray-900";

  return (
    <span style={D} className={`${fontSize} font-black tracking-tight inline-flex items-center`}>
      <span className={color}>Ticket</span>
      <span className={`relative flex items-center justify-center text-[#CCFF00] ${zSize} leading-none ml-[1px]`}>
        Z
        <Sparkles className={`absolute -top-1 -right-3 text-${variant === "dark" ? "white" : "gray-900"} fill-${variant === "dark" ? "white" : "gray-900"}`} size={iconSize} />
      </span>
    </span>
  );
}

function SoldBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#FF2D20" : pct >= 70 ? "#FF9500" : "#CCFF00";
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Đã bán</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-[2px] bg-white/10 w-full">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Tag({ tag, tagStyle }: { tag: string; tagStyle: string }) {
  return <span className={`inline-block text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 ${tagStyle}`}>{tag}</span>;
}

// ─── ADMIN COMPONENTS ─────────────────────────────────────────────────────────

// Admin Sidebar
function AdminSidebar({ active, onNav }: { active: string; onNav: (s: PageState) => void }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} />, page: { page: "admin-dashboard" as const } },
    { id: "concerts", label: "Quản lý Concert", icon: <FileText size={16} />, page: { page: "admin-concerts" as const } },
    { id: "orders", label: "Đơn hàng", icon: <ShoppingCart size={16} />, page: { page: "admin-orders" as const } },
    { id: "tickets", label: "Vé điện tử", icon: <Ticket size={16} />, page: { page: "admin-tickets" as const } },
    { id: "users", label: "Người dùng", icon: <UserCheck size={16} />, page: { page: "admin-users" as const } },
    { id: "guests", label: "Khách mời VIP", icon: <Users size={16} />, page: { page: "admin-guests" as const } },
    { id: "ai-bio", label: "AI Artist Bio", icon: <Brain size={16} />, page: { page: "admin-ai-bio" as const } },
    { id: "checkin", label: "Soát vé", icon: <QrCode size={16} />, page: { page: "admin-checkin" as const } },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Logo variant="light" />
        <p className="text-xs text-gray-500 mt-1 font-medium">Admin Panel</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => (
          <button key={item.id} onClick={() => onNav(item.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-none transition-colors ${
              active === item.id
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={() => onNav({ page: "home" })} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-none transition-colors">
          <LogOut size={16} />
          Về trang chủ
        </button>
      </div>
    </aside>
  );
}

// Admin Layout
function AdminLayout({ active, children, onNav }: { active: string; children: React.ReactNode; onNav: (s: PageState) => void }) {
  return (
    <div className="min-h-screen flex bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AdminSidebar active={active} onNav={onNav} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// Admin Stats Card
function AdminStatCard({ title, value, icon, trend, trendValue }: { title: string; value: string; icon: React.ReactNode; trend?: "up" | "down"; trendValue?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-none p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="w-10 h-10 bg-gray-100 rounded-none flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <p style={D} className="text-3xl font-black text-gray-900 mb-2">{value}</p>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
          <TrendingUp size={12} className={trend === "down" ? "rotate-180" : ""} />
          {trendValue}
        </div>
      )}
    </div>
  );
}

// Concert Modal
function ConcertModal({ concert, onClose, onSave }: { concert?: typeof EVENTS[0] | null; onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: concert?.name || "",
    subtitle: concert?.subtitle || "",
    artist: concert?.artist || "",
    date: concert?.date || "",
    time: concert?.time || "",
    venue: concert?.venue || "",
    city: concert?.city || "",
    price: concert?.price || "",
    category: concert?.category || "Nhạc Pop",
    description: concert?.description || "",
    image: concert?.image || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-none w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 style={D} className="text-2xl font-black uppercase italic text-gray-900">
            {concert ? "Chỉnh sửa Concert" : "Thêm Concert mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên concert *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="ANH TRAI SAY HI"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phụ đề</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="ATSH Concert 2026"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nghệ sĩ *</label>
            <input
              type="text"
              required
              value={formData.artist}
              onChange={e => setFormData({ ...formData, artist: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
              placeholder="HIEUTHUHAI, Quân A.P, Rhyder"
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ngày diễn *</label>
              <input
                type="text"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="14 THG 6, 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Giờ bắt đầu *</label>
              <input
                type="text"
                required
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="18:00"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Địa điểm *</label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="Sân Vận Động Mỹ Đình"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Thành phố *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="Hà Nội"
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Giá vé từ (đ) *</label>
              <input
                type="text"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
                placeholder="800.000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Thể loại *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400">
                {CATEGORIES.slice(1).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400 resize-none"
              placeholder="Mô tả chi tiết về concert..."
            />
          </div>

          {/* Row 7 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">URL ảnh</label>
            <input
              type="url"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
              placeholder="https://..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-none hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gray-900 text-white font-bold rounded-none hover:bg-gray-800 transition-colors">
              {concert ? "Lưu thay đổi" : "Thêm concert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Admin Dashboard
const REVENUE_CHART_DATA = [
  { day: "10/05", revenue: 3200000000, tickets: 890 },
  { day: "17/05", revenue: 5800000000, tickets: 1420 },
  { day: "24/05", revenue: 4100000000, tickets: 1100 },
  { day: "31/05", revenue: 7600000000, tickets: 2050 },
  { day: "07/06", revenue: 9200000000, tickets: 2340 },
  { day: "14/06", revenue: 12400000000, tickets: 3180 },
  { day: "17/06", revenue: 6300000000, tickets: 1867 },
];

const CONCERT_PERF = [
  { name: "ANH TRAI SAY HI",    sold: 93, total: 8000, revenue: 18600000000, status: "ĐANG BÁN",  id: 1 },
  { name: "MỸ TÂM TOUR 2026",   sold: 71, total: 3000, revenue: 12580000000, status: "ĐANG BÁN",  id: 5 },
  { name: "AFTERPARTY FESTIVAL", sold: 58, total: 5000, revenue: 8700000000,  status: "ĐANG BÁN",  id: 6 },
  { name: "BINZ × TOULIVER",    sold: 94, total: 2000, revenue: 7540000000,  status: "GẦN HẾT VÉ", id: 3 },
  { name: "RAP VIỆT ALL-STARS", sold: 62, total: 4000, revenue: 6200000000,  status: "ĐANG BÁN",  id: 2 },
  { name: "ĐEN VÂU — TRỜI ƠI!", sold: 45, total: 3500, revenue: 3150000000,  status: "ĐANG BÁN",  id: 4 },
];

function AdminDashboard({ onNav }: { onNav: (s: PageState) => void }) {
  const [revenueRange, setRevenueRange] = useState<"7d" | "30d">("7d");

  const totalRevenue = CONCERT_PERF.reduce((s, c) => s + c.revenue, 0);
  const totalTickets = CONCERT_PERF.reduce((s, c) => s + Math.round(c.total * c.sold / 100), 0);
  const checkinCount = ADMIN_TICKETS.filter(t => t.status === "CHECKED_IN").length;

  return (
    <AdminLayout active="dashboard" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm">Cập nhật lúc 17/06/2026, 14:32</p>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AdminStatCard title="Tổng doanh thu" value={`${(totalRevenue / 1e9).toFixed(1)}B đ`} icon={<DollarSign size={20} />} trend="up" trendValue="+12.5% so với tháng trước" />
          <AdminStatCard title="Vé đã bán" value={totalTickets.toLocaleString("vi-VN")} icon={<Ticket size={20} />} trend="up" trendValue="+8.2% so với tháng trước" />
          <AdminStatCard title="Sự kiện đang bán" value={String(EVENTS.length)} icon={<Calendar size={20} />} />
          <AdminStatCard title="Đã check-in hôm nay" value={String(checkinCount)} icon={<UserCheck size={20} />} trend="up" trendValue="2 vé trong 1 giờ qua" />
        </div>

        {/* Revenue Chart + Concert Perf — equal 2 cols */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Revenue area chart */}
          <div className="bg-white border border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 style={D} className="text-lg font-black uppercase italic text-gray-900">Doanh thu & Lượng bán</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Theo tuần · VNĐ</p>
              </div>
              <div className="flex gap-1">
                {(["7d", "30d"] as const).map(r => (
                  <button key={r} onClick={() => setRevenueRange(r)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${revenueRange === r ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                    {r === "7d" ? "7 ngày" : "30 ngày"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col px-5 pt-5 pb-4 min-h-0">
              <div className="flex-1 min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(v: number, name: string) => [
                      name === "revenue" ? `${(v / 1e9).toFixed(2)}B đ` : v.toLocaleString("vi-VN") + " vé",
                      name === "revenue" ? "Doanh thu" : "Vé bán"
                    ]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={1.5} fill="url(#revGrad)" dot={{ r: 2.5, fill: "#111827" }} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Số vé bán theo tuần</p>
                <ResponsiveContainer width="100%" height={52}>
                  <BarChart data={REVENUE_CHART_DATA} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString("vi-VN") + " vé", "Vé bán"]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 0, fontSize: 11 }} />
                    <Bar dataKey="tickets" radius={0}>
                      {REVENUE_CHART_DATA.map((_, i) => (
                        <Cell key={i} fill={i === REVENUE_CHART_DATA.length - 1 ? "#374151" : "#e5e7eb"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Concert performance — clean */}
          <div className="bg-white border border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 style={D} className="text-lg font-black uppercase italic text-gray-900">Hiệu suất Concert</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">% vé đã bán · xếp theo doanh thu</p>
              </div>
              <button onClick={() => onNav({ page: "admin-concerts" })}
                className="text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                Xem tất cả →
              </button>
            </div>

            <div className="flex-1 divide-y divide-gray-100">
              {CONCERT_PERF.map((c, i) => {
                const pct = c.sold;
                const soldCount = Math.round(c.total * pct / 100);
                const barColor = pct >= 90 ? "#dc2626" : pct >= 70 ? "#ea580c" : "#6b7280";

                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onNav({ page: "admin-concerts" })}>
                    {/* Index */}
                    <span className="text-xs font-mono text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span style={D} className="text-sm font-black uppercase text-gray-800 truncate pr-2">{c.name}</span>
                        <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color: barColor }}>{pct}%</span>
                      </div>
                      <div className="h-1 bg-gray-100 w-full">
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">{soldCount.toLocaleString("vi-VN")}/{c.total.toLocaleString("vi-VN")} vé</span>
                        <span className="text-[10px] font-semibold text-gray-500">{(c.revenue / 1e9).toFixed(1)}B đ</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">Tổng</span>
              <span style={D} className="text-base font-black text-gray-900">{(totalRevenue / 1e9).toFixed(1)} tỷ đồng</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Admin Concerts
function AdminConcerts({ onNav }: { onNav: (s: PageState) => void }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConcert, setEditingConcert] = useState<typeof EVENTS[0] | null>(null);
  const filtered = EVENTS.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (concert: typeof EVENTS[0]) => {
    setEditingConcert(concert);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingConcert(null);
    setModalOpen(true);
  };

  const handleSave = (data: any) => {
    console.log("Saving concert:", data);
    // TODO: Add API call here
  };

  return (
    <AdminLayout active="concerts" onNav={onNav}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Concert</h1>
            <p className="text-gray-600">Tạo và quản lý các sự kiện</p>
          </div>
          <button onClick={handleAdd} className="bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-none hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Plus size={16} /> Thêm concert
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm concert..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <button className="px-4 py-3 bg-white border border-gray-200 rounded-none hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter size={16} /> Lọc
          </button>
        </div>

        {/* Concerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(event => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-none overflow-hidden hover:border-gray-300 transition-colors">
              <div className="relative h-40">
                <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                {event.tag && (
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 ${event.tagStyle}`}>
                    {event.tag}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 style={D} className="text-lg font-black uppercase text-gray-900 mb-1">{event.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{event.date} · {event.venue}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">Đã bán {event.sold}%</span>
                  <span className="text-sm font-bold text-gray-900">{event.price}đ</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#CCFF00]" style={{ width: `${event.sold}%` }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(event)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                    <Edit size={12} /> Sửa
                  </button>
                  <button className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {modalOpen && (
          <ConcertModal
            concert={editingConcert}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Admin Orders
function AdminOrders({ onNav }: { onNav: (s: PageState) => void }) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const filtered = statusFilter === "ALL" ? ADMIN_ORDERS : ADMIN_ORDERS.filter(o => o.status === statusFilter);

  return (
    <AdminLayout active="orders" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Đơn hàng</h1>
          <p className="text-gray-600">Quản lý toàn bộ đơn hàng của khách hàng</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["ALL", "PAID", "PENDING", "CANCELLED"].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-bold rounded-none transition-colors ${
                statusFilter === status
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}>
              {status === "ALL" ? "Tất cả" : status}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khu vực</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SL</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.event}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.zone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.qty}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}đ</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                        order.status === "PAID" ? "bg-green-100 text-green-700" :
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Admin Tickets
function AdminTickets({ onNav }: { onNav: (s: PageState) => void }) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const filtered = statusFilter === "ALL" ? ADMIN_TICKETS : ADMIN_TICKETS.filter(t => t.status === statusFilter);

  return (
    <AdminLayout active="tickets" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Quản lý Vé điện tử</h1>
          <p className="text-gray-600">Danh sách tất cả vé đã được tạo</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Tổng vé</p>
            <p style={D} className="text-3xl font-black text-gray-900">{ADMIN_TICKETS.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Đã check-in</p>
            <p style={D} className="text-3xl font-black text-green-600">{ADMIN_TICKETS.filter(t => t.status === "CHECKED_IN").length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Chưa sử dụng</p>
            <p style={D} className="text-3xl font-black text-gray-900">{ADMIN_TICKETS.filter(t => t.status === "UNUSED").length}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["ALL", "UNUSED", "CHECKED_IN"].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-bold rounded-none transition-colors ${
                statusFilter === status
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}>
              {status === "ALL" ? "Tất cả" : status === "UNUSED" ? "Chưa dùng" : "Đã check-in"}
            </button>
          ))}
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mã vé</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sự kiện</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khu vực</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">QR Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{ticket.id}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{ticket.orderId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ticket.event}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ticket.zone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.holder}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{ticket.qrCode}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                        ticket.status === "CHECKED_IN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {ticket.status === "CHECKED_IN" ? "Đã check-in" : "Chưa dùng"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ticket.checkInTime || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Admin User Modals ────────────────────────────────────────────────────────

const CURRENT_ADMIN_ID = 1; // ID của admin đang đăng nhập

function AdminEditUserModal({ user, onClose, onSave }: {
  user: typeof ADMIN_USERS[0];
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, email, role });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi thông tin</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{user.id} · {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Họ và tên</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Vai trò</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors bg-white">
              <option value="AUDIENCE">AUDIENCE</option>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button type="submit" className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors">Lưu thay đổi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminChangePasswordModal({ user, onClose }: { user: typeof ADMIN_USERS[0]; onClose: () => void }) {
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Đổi mật khẩu</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {success ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <p style={D} className="text-xl font-black uppercase italic text-gray-900">Đã cập nhật!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Mật khẩu mới</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8}
                  className="w-full border border-gray-200 text-gray-900 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 transition-colors" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Xác nhận mật khẩu</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-gray-400 transition-colors" />
            </div>
            {confirm && newPw !== confirm && (
              <p className="text-xs text-red-500">Mật khẩu không khớp</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
              <button type="submit" disabled={newPw !== confirm || !newPw}
                className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Cập nhật
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminDeleteUserModal({ user, onClose, onConfirm }: { user: typeof ADMIN_USERS[0]; onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === user.name.toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-red-200 w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 style={D} className="text-xl font-black uppercase italic text-red-600">Xóa tài khoản</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-100 p-4 mb-5 text-sm">
            <p className="font-semibold text-gray-900 mb-1">⚠ Không thể hoàn tác</p>
            <p className="text-gray-600 text-xs">Tài khoản <strong>{user.name}</strong> ({user.email}) sẽ bị xóa vĩnh viễn.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">
              Nhập <span className="text-red-600 font-black">{user.name.toUpperCase()}</span> để xác nhận
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
              placeholder={user.name.toUpperCase()}
              className="w-full border border-gray-200 text-gray-900 text-sm px-4 py-3 outline-none focus:border-red-300 transition-colors placeholder-gray-300" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
            <button onClick={isValid ? onConfirm : undefined} disabled={!isValid}
              className={`flex-1 text-sm font-black uppercase tracking-wider py-3 transition-colors ${isValid ? "bg-red-600 text-white hover:bg-red-700 cursor-pointer" : "bg-red-100 text-red-300 cursor-not-allowed"}`}>
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Users
function AdminUsers({ onNav }: { onNav: (s: PageState) => void }) {
  const [users, setUsers] = useState(ADMIN_USERS);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<typeof ADMIN_USERS[0] | null>(null);
  const [pwModal, setPwModal] = useState<typeof ADMIN_USERS[0] | null>(null);
  const [deleteModal, setDeleteModal] = useState<typeof ADMIN_USERS[0] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSaveEdit(id: number, data: { name: string; email: string; role: string }) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }

  function handleDelete(id: number) {
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteModal(null);
  }

  return (
    <AdminLayout active="users" onNav={onNav}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Người dùng</h1>
            <p className="text-gray-600">Quản lý người dùng và phân quyền</p>
          </div>
          <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-none hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Plus size={16} /> Thêm người dùng
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Tổng người dùng</p>
            <p style={D} className="text-3xl font-black text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Khán giả</p>
            <p style={D} className="text-3xl font-black text-gray-900">{users.filter(u => u.role === "AUDIENCE").length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Nhân viên / Admin</p>
            <p style={D} className="text-3xl font-black text-gray-900">{users.filter(u => u.role === "STAFF" || u.role === "ADMIN").length}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => {
                  const isSelf = user.id === CURRENT_ADMIN_ID;
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 ${isSelf ? "bg-yellow-50/60" : ""}`}>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">#{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-200">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded-none ${
                          user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                          user.role === "STAFF" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block" ref={openMenuId === user.id ? menuRef : undefined}>
                          <button onClick={() => setOpenMenuId(id => id === user.id ? null : user.id)}
                            className="text-gray-400 hover:text-gray-700 p-1 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-lg z-50">
                              <button onClick={() => { setEditModal(user); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                                <Edit size={13} className="text-gray-400" /> Đổi thông tin
                              </button>
                              <button onClick={() => { setPwModal(user); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                                <Lock size={13} className="text-gray-400" /> Đổi mật khẩu
                              </button>
                              {!isSelf && (
                                <>
                                  <div className="border-t border-gray-100" />
                                  <button onClick={() => { setDeleteModal(user); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                    <Trash2 size={13} /> Xóa tài khoản
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editModal && (
        <AdminEditUserModal user={editModal} onClose={() => setEditModal(null)}
          onSave={data => handleSaveEdit(editModal.id, data)} />
      )}
      {pwModal && (
        <AdminChangePasswordModal user={pwModal} onClose={() => setPwModal(null)} />
      )}
      {deleteModal && (
        <AdminDeleteUserModal user={deleteModal} onClose={() => setDeleteModal(null)}
          onConfirm={() => handleDelete(deleteModal.id)} />
      )}
    </AdminLayout>
  );
}

// Admin Guests (CSV Import)
function AdminGuests({ onNav }: { onNav: (s: PageState) => void }) {
  return (
    <AdminLayout active="guests" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Khách mời VIP</h1>
          <p className="text-gray-600">Quản lý danh sách khách mời từ nhãn hàng tài trợ</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-none p-12 mb-8 text-center hover:border-gray-400 transition-colors">
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Nhập danh sách từ CSV</h3>
          <p className="text-sm text-gray-600 mb-6">Kéo thả file CSV hoặc click để chọn file</p>
          <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-none hover:bg-gray-800 transition-colors">
            Chọn file CSV
          </button>
          <p className="text-xs text-gray-500 mt-4">Định dạng: concert, name, email, phone</p>
        </div>

        {/* Guests Table */}
        <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 style={D} className="text-xl font-black uppercase italic text-gray-900">Danh sách khách mời</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Concert</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Số điện thoại</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ADMIN_GUESTS.map(guest => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">#{guest.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{guest.concert}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{guest.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{guest.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{guest.phone}</td>
                    <td className="px-6 py-4">
                      {guest.checkedIn ? (
                        <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                          ✓ Đã check-in
                        </span>
                      ) : (
                        <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Chưa check-in
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Admin AI Bio
function AdminAIBio({ onNav }: { onNav: (s: PageState) => void }) {
  const [processing, setProcessing] = useState(false);

  return (
    <AdminLayout active="ai-bio" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">AI Artist Bio</h1>
          <p className="text-gray-600">Tạo giới thiệu nghệ sĩ tự động từ Press Kit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload */}
          <div>
            <div className="bg-white border border-gray-200 rounded-none p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tải lên Press Kit</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center mb-4">
                <Brain size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">Tải lên file PDF Press Kit hoặc Artist Profile</p>
                <button className="bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-none hover:bg-gray-800 transition-colors">
                  Chọn PDF
                </button>
              </div>
              <p className="text-xs text-gray-500">Hệ thống sẽ tự động trích xuất thông tin và tóm tắt bằng AI</p>
            </div>

            {/* Concert Selection */}
            <div className="bg-white border border-gray-200 rounded-none p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn concert</h3>
              <select className="w-full px-4 py-3 bg-white border border-gray-200 rounded-none text-sm focus:outline-none focus:border-gray-400 mb-4">
                <option>Chọn concert...</option>
                {EVENTS.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <button
                onClick={() => { setProcessing(true); setTimeout(() => setProcessing(false), 3000); }}
                disabled={processing}
                className="w-full bg-[#CCFF00] text-black font-bold text-sm px-6 py-3 rounded-none hover:bg-[#B8E600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? "Đang xử lý..." : "Tạo Bio bằng AI"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Preview</h3>
            {processing ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Đang phân tích PDF và tạo nội dung...</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 leading-relaxed">
                <p className="mb-4">AI sẽ tạo ra đoạn giới thiệu ngắn gọn về nghệ sĩ dựa trên thông tin từ Press Kit.</p>
                <p className="italic text-gray-500">Kết quả sẽ hiển thị ở đây sau khi xử lý...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Admin Check-in
function AdminCheckin({ onNav }: { onNav: (s: PageState) => void }) {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  return (
    <AdminLayout active="checkin" onNav={onNav}>
      <div className="p-8">
        <div className="mb-8">
          <h1 style={D} className="text-4xl font-black uppercase italic text-gray-900 mb-2">Soát vé</h1>
          <p className="text-gray-600">Quét QR code để check-in khách hàng</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <div className="bg-white border border-gray-200 rounded-none p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quét mã QR</h3>
            <div className="bg-gray-100 rounded-none p-12 text-center mb-4">
              <QrCode size={96} className="mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-6">
                {scanning ? "Đang quét..." : "Click để bắt đầu quét QR code"}
              </p>
              <button
                onClick={() => {
                  setScanning(true);
                  setTimeout(() => {
                    setScanning(false);
                    setLastScan("VT-" + Math.random().toString(36).substring(2, 8).toUpperCase());
                  }, 1500);
                }}
                className={`${
                  scanning ? "bg-gray-400" : "bg-gray-900"
                } text-white font-bold text-sm px-8 py-3 rounded-none hover:bg-gray-800 transition-colors`}>
                {scanning ? "Đang quét..." : "Bắt đầu quét"}
              </button>
            </div>
            {lastScan && (
              <div className="bg-green-50 border border-green-200 rounded-none p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-900">Check-in thành công!</p>
                  <p className="text-xs text-green-700">Vé số: {lastScan}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-none p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Đã check-in</p>
                <p style={D} className="text-3xl font-black text-green-600">847</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-none p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Chưa check-in</p>
                <p style={D} className="text-3xl font-black text-gray-900">12,000</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-none p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Check-in gần đây</h3>
              <div className="space-y-3">
                {["VT-A1B2C3", "VT-D4E5F6", "VT-G7H8I9"].map((ticket, i) => (
                  <div key={ticket} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-mono font-semibold text-gray-900">{ticket}</p>
                      <p className="text-xs text-gray-500">{new Date(Date.now() - i * 60000).toLocaleTimeString("vi-VN")}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── MOBILE STAFF APP ─────────────────────────────────────────────────────────

// Mobile Bottom Nav
function MobileBottomNav({ active, onNav, eventId }: { active: "scanner" | "history" | "settings"; onNav: (s: PageState) => void; eventId: number }) {
  const tabs = [
    { id: "scanner" as const,  icon: <ScanLine size={20} />, label: "Quét vé",  page: { page: "staff-scanner" as const,  eventId } },
    { id: "history" as const,  icon: <History size={20} />,  label: "Lịch sử",  page: { page: "staff-history" as const,  eventId } },
    { id: "settings" as const, icon: <Settings size={20} />, label: "Cài đặt",  page: { page: "staff-settings" as const, eventId } },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onNav(t.page)}
            className={`flex flex-col items-center gap-1 flex-1 py-3 transition-colors ${active === t.id ? "text-gray-900" : "text-gray-400"}`}>
            {t.icon}
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// Mobile Top Bar
function MobileTopBar({ title, onBack, rightButton }: { title: string; onBack?: () => void; rightButton?: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
          <ChevronLeft size={20} />
        </button>
      ) : (
        <div className="w-5" />
      )}
      <h1 style={D} className="text-lg font-black uppercase italic text-gray-900">{title}</h1>
      {rightButton || <div className="w-5" />}
    </header>
  );
}

// Staff Login
function StaffLogin({ onNav }: { onNav: (s: PageState) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - in reality would call API
    onNav({ page: "staff-event-select" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <button onClick={() => onNav({ page: "home" })} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
        <X size={24} />
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-4">
            <Lock size={32} className="text-gray-600" />
          </div>
          <h1 style={D} className="text-3xl font-black uppercase italic text-gray-900 mb-2">Soát Vé</h1>
          <p className="text-sm text-gray-600">Đăng nhập để bắt đầu ca làm việc</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              placeholder="staff@ticketz.vn"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-bold text-sm py-4 hover:bg-gray-800 transition-colors">
            Đăng nhập
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Chỉ dành cho nhân viên soát vé<br />Liên hệ admin để được cấp tài khoản
        </p>
      </div>
    </div>
  );
}

// Staff Event Selection
function StaffEventSelect({ onNav }: { onNav: (s: PageState) => void }) {
  const todayEvents = EVENTS.filter(e => e.date.includes("14 THG 6") || e.date.includes("22 THG 6")).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <MobileTopBar
        title="Chọn sự kiện"
        onBack={() => onNav({ page: "staff-login" })}
        rightButton={
          <button onClick={() => onNav({ page: "home" })} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h2 style={D} className="text-2xl font-black uppercase italic text-gray-900 mb-2">Ca làm việc hôm nay</h2>
          <p className="text-sm text-gray-600">Chọn sự kiện bạn đang phụ trách</p>
        </div>

        <div className="space-y-3">
          {todayEvents.map(event => (
            <button
              key={event.id}
              onClick={() => onNav({ page: "staff-sync", eventId: event.id })}
              className="w-full bg-white border border-gray-200 p-4 text-left hover:border-gray-900 transition-colors">
              <div className="flex items-start gap-4">
                <img src={event.image} alt={event.name} className="w-20 h-20 object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 style={D} className="text-lg font-black uppercase text-gray-900 mb-1">{event.name}</h3>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p className="flex items-center gap-1">
                      <Calendar size={12} className="shrink-0" />
                      {event.date} · {event.time}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      {event.venue}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 shrink-0" />
              </div>
            </button>
          ))}
        </div>

        {todayEvents.length === 0 && (
          <div className="py-20 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Không có sự kiện nào hôm nay</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Staff Sync Screen
function StaffSync({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) || EVENTS[0];
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Simulate download
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setStatus("success");
          setTimeout(() => onNav({ page: "staff-scanner", eventId }), 1000);
          return 100;
        }
        return p + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [eventId, onNav]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-sm text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 mb-6 ${
          status === "loading" ? "bg-gray-100" :
          status === "success" ? "bg-green-100" :
          "bg-red-100"
        }`}>
          {status === "loading" && <Database size={40} className="text-gray-600 animate-pulse" />}
          {status === "success" && <CheckCircle size={40} className="text-green-600" />}
          {status === "error" && <XCircle size={40} className="text-red-600" />}
        </div>

        <h2 style={D} className="text-2xl font-black uppercase italic text-gray-900 mb-2">
          {status === "loading" && "Đang tải dữ liệu..."}
          {status === "success" && "Hoàn tất!"}
          {status === "error" && "Lỗi kết nối"}
        </h2>

        <p className="text-sm text-gray-600 mb-8">
          {status === "loading" && `Đang tải danh sách vé của ${event.name}`}
          {status === "success" && "Sẵn sàng soát vé"}
          {status === "error" && "Không thể kết nối đến server"}
        </p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Tiến độ</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 w-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-50 border border-gray-200 p-4 text-left space-y-2 text-xs">
          <p className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            Tải 12,847 vé hợp lệ
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            Lưu vào bộ nhớ thiết bị
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            Bật chế độ offline
          </p>
        </div>

        {status === "error" && (
          <button
            onClick={() => setProgress(0)}
            className="w-full bg-gray-900 text-white font-bold text-sm py-3 mt-6 hover:bg-gray-800 transition-colors">
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

// Offline Indicator
function OfflineIndicator({ isOnline, pendingSync }: { isOnline: boolean; pendingSync?: number }) {
  return (
    <div className={`px-4 py-2 flex items-center justify-between gap-2 text-xs font-semibold ${
      isOnline ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
    }`}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        {isOnline ? "Đã kết nối - Đồng bộ tự động" : "Offline - Dữ liệu lưu cục bộ"}
      </div>
      {!isOnline && pendingSync && pendingSync > 0 ? (
        <span className="bg-orange-600 text-white px-2 py-0.5 text-[10px]">
          {pendingSync} chưa sync
        </span>
      ) : null}
    </div>
  );
}

// Staff Scanner Screen
function StaffScanner({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) || EVENTS[0];
  const [isOnline, setIsOnline] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ qrCode: string; status: "valid" | "duplicate" | "invalid"; event: string; zone: string; holder: string; message: string } | null>(null);
  const [scannedToday, setScannedToday] = useState(847);
  const [pendingSync, setPendingSync] = useState(0);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const random = Math.random();
      const qrCode = "VT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      if (random > 0.8) {
        // Duplicate
        setLastResult({
          qrCode,
          status: "duplicate",
          event: event.name,
          zone: "SVIP — A",
          holder: "Nguyễn Văn A",
          message: "Vé này đã được quét lúc 18:30"
        });
      } else if (random > 0.95) {
        // Invalid
        setLastResult({
          qrCode,
          status: "invalid",
          event: "",
          zone: "",
          holder: "",
          message: "Mã QR không hợp lệ hoặc không thuộc sự kiện này"
        });
      } else {
        // Valid
        setLastResult({
          qrCode,
          status: "valid",
          event: event.name,
          zone: "SVIP — A",
          holder: "Nguyễn Văn A",
          message: "Check-in thành công"
        });
        setScannedToday(prev => prev + 1);
        if (!isOnline) {
          setPendingSync(prev => prev + 1);
        }
      }
      setScanning(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => onNav({ page: "staff-event-select" })} className="text-gray-600 hover:text-gray-900">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <Logo variant="light" size="sm" />
          <span className="text-[10px] text-gray-500 font-medium mt-0.5">{event.name.substring(0, 20)}</span>
        </div>
        <button onClick={() => onNav({ page: "home" })} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      <OfflineIndicator isOnline={isOnline} pendingSync={pendingSync} />

      <main className="flex-1 pb-20 overflow-auto">
        {/* Stats */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Hôm nay</p>
              <p style={D} className="text-2xl font-black text-gray-900">{scannedToday}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Chưa sync</p>
              <p style={D} className="text-2xl font-black text-orange-600">{pendingSync}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Lỗi</p>
              <p style={D} className="text-2xl font-black text-red-600">3</p>
            </div>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          <div className="bg-white border-2 border-gray-200 rounded-none p-8 text-center mb-6">
            <div className="w-48 h-48 mx-auto mb-6 bg-gray-100 rounded-none flex items-center justify-center relative overflow-hidden">
              {scanning ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-[#CCFF00] animate-pulse" style={{ animation: "scan 2s ease-in-out infinite" }}></div>
                  </div>
                  <Camera size={64} className="text-gray-400" />
                </div>
              ) : (
                <QrCode size={64} className="text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {scanning ? "Đang quét QR code..." : "Sẵn sàng quét vé"}
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className={`w-full ${
                scanning ? "bg-gray-300" : "bg-gray-900 hover:bg-gray-800"
              } text-white font-bold text-sm py-4 rounded-none transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
              {scanning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Đang quét...
                </>
              ) : (
                <>
                  <ScanLine size={16} /> Bắt đầu quét
                </>
              )}
            </button>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className={`border-2 rounded-none p-6 ${
              lastResult.status === "valid" ? "bg-green-50 border-green-200" :
              lastResult.status === "duplicate" ? "bg-orange-50 border-orange-200" :
              "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-3 mb-4">
                {lastResult.status === "valid" ? (
                  <CheckCircle size={32} className="text-green-600 shrink-0" />
                ) : lastResult.status === "duplicate" ? (
                  <AlertCircle size={32} className="text-orange-600 shrink-0" />
                ) : (
                  <XCircle size={32} className="text-red-600 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-lg font-black mb-1 ${
                    lastResult.status === "valid" ? "text-green-900" :
                    lastResult.status === "duplicate" ? "text-orange-900" :
                    "text-red-900"
                  }`}>
                    {lastResult.message}
                  </p>
                  <p className="font-mono text-sm text-gray-700 mb-3">{lastResult.qrCode}</p>
                  {lastResult.status !== "invalid" && (
                    <>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700"><span className="font-semibold">Sự kiện:</span> {lastResult.event}</p>
                        <p className="text-gray-700"><span className="font-semibold">Khu vực:</span> {lastResult.zone}</p>
                        <p className="text-gray-700"><span className="font-semibold">Khách hàng:</span> {lastResult.holder}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {lastResult.status === "valid" && (isOnline ? "✓ Đã đồng bộ lên server" : "⏳ Sẽ đồng bộ khi có mạng")}
                {lastResult.status === "duplicate" && "⚠️ Vui lòng kiểm tra lại"}
                {lastResult.status === "invalid" && "✕ Không cho phép vào"}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-6 pb-6">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className="bg-white border border-gray-200 rounded-none p-4 text-left hover:bg-gray-50 transition-colors">
              <RefreshCw size={20} className="text-gray-600 mb-2" />
              <p className="text-sm font-bold text-gray-900">Đồng bộ</p>
              <p className="text-xs text-gray-600">{isOnline ? "Online" : "Offline"}</p>
            </button>
            <button
              onClick={() => onNav({ page: "staff-history", eventId })}
              className="bg-white border border-gray-200 rounded-none p-4 text-left hover:bg-gray-50 transition-colors">
              <History size={20} className="text-gray-600 mb-2" />
              <p className="text-sm font-bold text-gray-900">Lịch sử</p>
              <p className="text-xs text-gray-600">{scannedToday} vé</p>
            </button>
          </div>
        </div>
      </main>

      <MobileBottomNav active="scanner" onNav={onNav} eventId={eventId} />

      <style>{`
        @keyframes scan { 0%, 100% { transform: translateY(-100%); } 50% { transform: translateY(100%); } }
      `}</style>
    </div>
  );
}

// Staff History Screen
function StaffHistory({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) || EVENTS[0];
  const [isOnline, setIsOnline] = useState(true);

  const allScanned: ScannedTicket[] = [
    { qrCode: "VT-A1B2C3", event: event.name, zone: "SVIP — A",    holder: "Nguyễn Văn A",  scannedAt: "19:45", synced: true,  status: "valid" },
    { qrCode: "VT-D4E5F6", event: event.name, zone: "VIP — B",     holder: "Trần Thị B",    scannedAt: "19:42", synced: true,  status: "valid" },
    { qrCode: "VT-G7H8I9", event: event.name, zone: "SVIP — A",    holder: "Lê Văn C",      scannedAt: "19:40", synced: false, status: "duplicate" },
    { qrCode: "VT-J1K2L3", event: event.name, zone: "CAT 1A",      holder: "Phạm Thị D",    scannedAt: "19:38", synced: true,  status: "valid" },
    { qrCode: "VT-M4N5O6", event: event.name, zone: "FANZONE 1A",  holder: "Hoàng Văn E",   scannedAt: "19:35", synced: true,  status: "valid" },
    { qrCode: "VT-P7Q8R9", event: event.name, zone: "CAT 2A",      holder: "Vũ Thị F",      scannedAt: "19:31", synced: true,  status: "valid" },
    { qrCode: "VT-INVALID", event: "",         zone: "",             holder: "",               scannedAt: "19:30", synced: true,  status: "invalid" },
  ];
  const totalTickets = 12847;
  const validList = allScanned.filter(t => t.status === "valid");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <MobileTopBar title="Lịch sử quét" onBack={() => onNav({ page: "staff-scanner", eventId })} />
      <OfflineIndicator isOnline={isOnline} />

      <main className="flex-1 pb-20 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 bg-white border-b border-gray-200">
          <div className="p-5 text-center border-r border-gray-200">
            <p style={D} className="text-3xl font-black text-gray-900">{totalTickets.toLocaleString("vi-VN")}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-medium">Tổng số vé</p>
          </div>
          <div className="p-5 text-center">
            <p style={D} className="text-3xl font-black text-green-600">{validList.length}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-medium">Đã quét</p>
          </div>
        </div>

        {/* Valid ticket list */}
        <div className="divide-y divide-gray-200">
          {validList.map((ticket, i) => (
            <div key={i} className="bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ticket.holder}</p>
                  <p className="text-xs text-gray-400 shrink-0">{ticket.scannedAt}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{ticket.zone}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-mono text-gray-400">{ticket.qrCode}</p>
                {!ticket.synced && (
                  <span className="text-[9px] font-bold text-orange-500 uppercase">Chưa sync</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {validList.length === 0 && (
          <div className="p-12 text-center">
            <History size={44} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Chưa có vé nào được quét</p>
          </div>
        )}
      </main>

      <MobileBottomNav active="history" onNav={onNav} eventId={eventId} />
    </div>
  );
}

// Staff Settings Screen
function StaffSettings({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const [name, setName] = useState("Staff Soát Vé");
  const [showPwSection, setShowPwSection] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  function handleSavePw(e: React.FormEvent) {
    e.preventDefault();
    setPwSaved(true);
    setCurPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => { setPwSaved(false); setShowPwSection(false); }, 1800);
  }

  const initials = name.trim().split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "S";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <MobileTopBar title="Cài đặt" />

      <main className="flex-1 pb-24 overflow-auto">
        {/* Profile header */}
        <div className="bg-white border-b border-gray-200 px-5 py-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-900 flex items-center justify-center shrink-0">
            <span style={D} className="text-2xl font-black text-white">{initials}</span>
          </div>
          <div>
            <p style={D} className="text-xl font-black uppercase italic text-gray-900 leading-tight">{name}</p>
            <p className="text-xs text-gray-500 mt-1">staff@viticket.vn</p>
            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 mt-1.5">STAFF</span>
          </div>
        </div>

        {/* Name form */}
        <div className="bg-white border-b border-gray-200 px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">Thông tin cá nhân</p>
          <form onSubmit={handleSaveName}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Họ và tên</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 outline-none focus:border-gray-400 focus:bg-white transition-colors mb-4" />
            <button type="submit"
              className={`w-full text-sm font-black uppercase tracking-wider py-3 transition-colors ${nameSaved ? "bg-green-600 text-white" : "bg-gray-900 text-white hover:bg-gray-700"}`}>
              {nameSaved ? "✓ Đã lưu" : "Lưu thông tin"}
            </button>
          </form>
        </div>

        {/* Password section */}
        <div className="bg-white border-b border-gray-200 px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Mật khẩu</p>
            {!showPwSection && (
              <button onClick={() => setShowPwSection(true)}
                className="text-xs font-bold text-gray-900 border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors">
                Đổi mật khẩu
              </button>
            )}
          </div>

          {showPwSection && (
            pwSaved ? (
              <div className="py-6 text-center">
                <div className="w-10 h-10 bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Đổi mật khẩu thành công</p>
              </div>
            ) : (
              <form onSubmit={handleSavePw} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input type={showCur ? "text" : "password"} value={curPw} onChange={e => setCurPw(e.target.value)} required
                      className="w-full border border-gray-200 bg-gray-50 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                    <button type="button" onClick={() => setShowCur(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mật khẩu mới</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8}
                      className="w-full border border-gray-200 bg-gray-50 text-sm px-4 pr-10 py-3 outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                    <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Xác nhận mật khẩu mới</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                    className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                  {confirmPw && newPw !== confirmPw && <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowPwSection(false)}
                    className="flex-1 border border-gray-200 text-sm font-semibold py-3 text-gray-600 hover:bg-gray-50 transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={!curPw || newPw !== confirmPw || !newPw}
                    className="flex-1 bg-gray-900 text-white text-sm font-black uppercase tracking-wider py-3 hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Cập nhật
                  </button>
                </div>
              </form>
            )
          )}
          {!showPwSection && (
            <p className="text-xs text-gray-400">Thay đổi mật khẩu đăng nhập của bạn</p>
          )}
        </div>

        {/* Change event + Sign out */}
        <div className="px-5 py-5 flex flex-col gap-3">
          <button onClick={() => onNav({ page: "staff-event-select" })}
            className="w-full border border-gray-200 bg-white text-sm font-bold text-gray-700 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} /> Đổi sự kiện soát vé
          </button>
          <button onClick={() => onNav({ page: "staff-login" })}
            className="w-full border border-gray-200 bg-white text-sm font-bold text-gray-700 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </main>

      <MobileBottomNav active="settings" onNav={onNav} eventId={eventId} />
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(true);
    setTimeout(onClose, 1600);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 style={D} className="text-xl font-black uppercase italic text-foreground">Đổi mật khẩu</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {success ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-[#CCFF00]/10 border border-[#CCFF00]/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-[#CCFF00]" />
            </div>
            <p style={D} className="text-2xl font-black uppercase italic text-foreground">Thành công!</p>
            <p className="text-xs text-muted-foreground mt-2">Mật khẩu đã được cập nhật.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Mật khẩu hiện tại</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} required
                  className="w-full bg-background border border-border text-foreground text-sm px-4 pr-10 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Mật khẩu mới</label>
              <div className="relative">
                <input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} required minLength={8}
                  className="w-full bg-background border border-border text-foreground text-sm px-4 pr-10 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
                <button type="button" onClick={() => setShowNext(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Xác nhận mật khẩu mới</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
            </div>
            <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-sm py-3 hover:bg-white transition-colors mt-2">
              Cập nhật mật khẩu
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === "XÓA TÀI KHOẢN";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-[#FF2D20]/50 w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 style={D} className="text-xl font-black uppercase italic text-[#FF2D20]">Xóa tài khoản</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="bg-[#FF2D20]/10 border border-[#FF2D20]/20 p-4 mb-5">
            <p className="text-sm text-foreground font-semibold mb-1">⚠ Hành động này không thể hoàn tác</p>
            <p className="text-xs text-muted-foreground">Toàn bộ vé, lịch sử đặt hàng và dữ liệu cá nhân sẽ bị xóa vĩnh viễn.</p>
          </div>
          <div className="mb-5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Nhập <span className="text-[#FF2D20] font-black">XÓA TÀI KHOẢN</span> để xác nhận
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
              placeholder="XÓA TÀI KHOẢN"
              className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-[#FF2D20]/40 transition-colors placeholder-muted-foreground" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-border text-sm font-semibold py-3 text-muted-foreground hover:text-foreground transition-colors">Hủy</button>
            <button onClick={isValid ? onConfirm : undefined} disabled={!isValid}
              className={`flex-1 text-sm font-black uppercase tracking-[0.12em] py-3 transition-colors ${isValid ? "bg-[#FF2D20] text-white hover:bg-red-700 cursor-pointer" : "bg-[#FF2D20]/20 text-[#FF2D20]/40 cursor-not-allowed"}`}>
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onNav }: { ticket: typeof USER_TICKETS[0]; onNav: (s: PageState) => void }) {
  const isUsed = ticket.status === "used";
  const accentText = ticket.color === "#CCFF00" ? "#000" : "#fff";
  return (
    <div className={`relative border overflow-hidden transition-all group ${isUsed ? "border-border opacity-60" : "border-border hover:border-[#CCFF00]/40"}`}>
      {/* Left color stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: ticket.color }} />
      <div className="flex items-stretch ml-[3px]">
        {/* Main body */}
        <div className="flex-1 p-5 bg-card min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5"
              style={!isUsed ? { backgroundColor: ticket.color, color: accentText } : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
              {isUsed ? "ĐÃ SỬ DỤNG" : "SẮP DIỄN RA"}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">{ticket.id}</span>
          </div>
          <h3 style={D} className="text-2xl font-black uppercase italic tracking-tight text-foreground mb-0.5 leading-tight">{ticket.event}</h3>
          <p className="text-xs text-muted-foreground mb-4">{ticket.subtitle}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mb-4">
            {[
              { label: "Ngày", value: ticket.date },
              { label: "Giờ", value: ticket.time },
              { label: "Địa điểm", value: ticket.venue },
              { label: "Khu vực", value: ticket.zone, accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">{label}</div>
                <div className="text-xs font-bold truncate" style={accent ? { color: ticket.color } : {}}>{value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground">CHỦ VÉ</span>
            <span className="text-xs font-bold text-foreground">{ticket.holder}</span>
            <span className="text-[9px] font-mono text-muted-foreground ml-1">·</span>
            <span className="text-[9px] font-mono text-muted-foreground">{fmt(ticket.price)}đ</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => onNav({ page: "event-detail", eventId: ticket.eventId })}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 transition-colors">
                Chi tiết
              </button>
              {!isUsed && (
                <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 transition-colors hover:opacity-80"
                  style={{ backgroundColor: ticket.color, color: accentText }}>
                  <Download size={11} /> PDF
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Perforated divider + QR side */}
        <div className="flex items-stretch shrink-0">
          <div className="w-px my-4 border-l-2 border-dashed border-border/50" />
          <div className="w-28 bg-card flex flex-col items-center justify-center p-4 gap-2">
            <div className={`w-[72px] h-[72px] border border-border flex items-center justify-center ${isUsed ? "opacity-25" : ""}`}>
              <QrCode size={44} className="text-foreground" />
            </div>
            <div className="text-[8px] font-mono tracking-widest text-muted-foreground text-center break-all">{ticket.qr}</div>
            {ticket.seat !== "GA" && (
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">GHẾ {ticket.seat}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── My Tickets Page ──────────────────────────────────────────────────────────

function MyTicketsPage({ onNav }: { onNav: (s: PageState) => void }) {
  const [tab, setTab] = useState<"upcoming" | "used">("upcoming");
  const filtered = USER_TICKETS.filter(t => t.status === tab);
  const upcomingCount = USER_TICKETS.filter(t => t.status === "upcoming").length;
  const usedCount = USER_TICKETS.filter(t => t.status === "used").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#CCFF00]" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Tài khoản</span>
          </div>
          <h1 style={D} className="text-5xl font-black uppercase italic tracking-tight mb-1">VÉ CỦA TÔI</h1>
          <p className="text-sm text-muted-foreground">{USER_TICKETS.length} vé · {upcomingCount} sắp diễn ra</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-8">
          {([
            { id: "upcoming" as const, label: "Sắp diễn ra", count: upcomingCount },
            { id: "used" as const, label: "Đã qua", count: usedCount },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors ${tab === t.id ? "border-[#CCFF00] text-[#CCFF00]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map(ticket => <TicketCard key={ticket.id} ticket={ticket} onNav={onNav} />)}
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center border border-border">
            <Ticket size={44} className="mx-auto text-white/8 mb-4" />
            <p style={D} className="text-2xl font-black uppercase italic text-white/15">Không có vé nào</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Account Settings Page ────────────────────────────────────────────────────

function AccountSettingsPage({ onNav, currentUser, onLogout }: {
  onNav: (s: PageState) => void;
  currentUser: { name: string; email: string } | null;
  onLogout: () => void;
}) {
  const [name, setName] = useState(currentUser?.name || "Sỹ Văn");
  const [phone, setPhone] = useState("0912 345 678");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = name.trim().split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "U";

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#CCFF00]" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Tài khoản</span>
          </div>
          <h1 style={D} className="text-5xl font-black uppercase italic tracking-tight">CÀI ĐẶT</h1>
        </div>

        {/* Profile card */}
        <div className="bg-card border border-border p-6 mb-3">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-[#CCFF00] flex items-center justify-center text-black text-3xl font-black" style={D}>
                {initials}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0D0D0D] border border-border flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors">
                <Edit size={12} className="text-muted-foreground" />
              </button>
            </div>
            <div>
              <div style={D} className="text-2xl font-black uppercase italic text-foreground leading-tight">{name}</div>
              <div className="text-xs text-muted-foreground mt-1">{currentUser?.email || "user@example.com"}</div>
              <button onClick={() => onNav({ page: "my-tickets" })}
                className="mt-2 text-[10px] font-mono text-[#CCFF00] hover:underline">
                {USER_TICKETS.filter(t => t.status === "upcoming").length} vé sắp diễn →
              </button>
            </div>
          </div>
        </div>

        {/* Info form */}
        <div className="bg-card border border-border p-6 mb-3">
          <h2 style={D} className="text-lg font-black uppercase italic mb-5 text-foreground">Thông tin cá nhân</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Họ và tên</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Số điện thoại</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-background border border-border text-foreground text-sm pl-9 pr-4 py-3 outline-none focus:border-[#CCFF00]/40 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Email đăng ký <span className="normal-case font-normal tracking-normal text-[9px]">(không thể thay đổi)</span>
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={currentUser?.email || "user@example.com"} readOnly
                  className="w-full bg-white/[0.02] border border-border text-muted-foreground text-sm pl-9 pr-10 py-3 outline-none cursor-not-allowed" />
                <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button onClick={handleSave}
              className={`font-black uppercase tracking-[0.12em] text-xs px-6 py-3 transition-colors ${saved ? "bg-[#CCFF00]/20 text-[#CCFF00]" : "bg-[#CCFF00] text-black hover:bg-white"}`}>
              {saved ? "✓ Đã lưu thay đổi" : "Lưu thay đổi"}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card border border-border p-6 mb-3">
          <h2 style={D} className="text-lg font-black uppercase italic mb-5 text-foreground">Bảo mật</h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-semibold text-foreground">Mật khẩu</div>
              <div className="text-xs text-muted-foreground mt-0.5">Thay đổi mật khẩu đăng nhập của bạn</div>
            </div>
            <button onClick={() => setShowPasswordModal(true)}
              className="text-[10px] font-black uppercase tracking-[0.15em] border border-border text-muted-foreground px-4 py-2 hover:border-[#CCFF00]/40 hover:text-foreground transition-colors">
              Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-card border border-[#FF2D20]/30 p-6">
          <h2 style={D} className="text-lg font-black uppercase italic mb-1 text-[#FF2D20]">Vùng nguy hiểm</h2>
          <p className="text-xs text-muted-foreground mb-5">Các hành động dưới đây không thể hoàn tác.</p>
          <button onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] border border-[#FF2D20]/40 text-[#FF2D20] px-4 py-2.5 hover:bg-[#FF2D20] hover:text-white transition-colors">
            <Trash2 size={12} /> Xóa tài khoản
          </button>
        </div>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={() => { onLogout(); onNav({ page: "home" }); }} />}
    </div>
  );
}

// ─── Search Results Page ──────────────────────────────────────────────────────

function SearchResultsPage({ query, onNav }: { query: string; onNav: (s: PageState) => void }) {
  const [input, setInput] = useState(query);
  const [current, setCurrent] = useState(query);

  const noResultTerms = ["xyz", "abcdef123", "nothing", "qwerty", "zzz"];
  const isNoResult = noResultTerms.some(t => current.toLowerCase().includes(t));

  const results = isNoResult ? [] : EVENTS.filter(e =>
    e.name.toLowerCase().includes(current.toLowerCase()) ||
    e.artist.toLowerCase().includes(current.toLowerCase()) ||
    e.city.toLowerCase().includes(current.toLowerCase()) ||
    e.category.toLowerCase().includes(current.toLowerCase()) ||
    current.trim().length >= 2
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) setCurrent(input.trim());
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        {/* Search header */}
        <div className="mb-10">
          <form onSubmit={handleSearch} className="flex max-w-2xl mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Tìm kiếm concert, nghệ sĩ..."
                className="w-full bg-card border border-border text-foreground text-sm pl-11 pr-4 py-4 outline-none focus:border-[#CCFF00]/40 transition-colors placeholder-muted-foreground" />
            </div>
            <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-xs px-6 hover:bg-white transition-colors">Tìm</button>
          </form>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-px bg-[#CCFF00]" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Kết quả</span>
          </div>
          <h1 style={D} className="text-4xl font-black uppercase italic tracking-tight leading-none">
            "{current}"
            <span className="text-muted-foreground text-2xl ml-3">— {results.length} kết quả</span>
          </h1>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map(ev => <SmallCard key={ev.id} event={ev} onNav={onNav} />)}
          </div>
        ) : (
          <div className="py-24 text-center border border-border">
            <div style={D} className="text-8xl font-black uppercase italic text-white/[0.03] mb-2 select-none">404</div>
            <Search size={40} className="mx-auto text-white/10 mb-4" />
            <p style={D} className="text-2xl font-black uppercase italic text-white/20 mb-2">Không tìm thấy</p>
            <p className="text-sm text-muted-foreground mb-6">Thử tìm với từ khóa khác</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Anh Trai", "Rap Việt", "EDM", "Mỹ Tâm", "Binz", "Hà Nội"].map(s => (
                <button key={s} onClick={() => { setInput(s); setCurrent(s); }}
                  className="border border-border text-[11px] font-semibold px-4 py-2 text-muted-foreground hover:border-[#CCFF00]/40 hover:text-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ onNav, onLogin, onLogout, isLoggedIn, currentUser }: {
  onNav: (s: PageState) => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  currentUser: { name: string; email: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNav({ page: "search-results", query: searchQuery.trim() });
      setSearchQuery("");
      setOpen(false);
    }
  }

  const initials = currentUser?.name?.trim().split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "U";

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-[#080808]/95 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <button onClick={() => onNav({ page: "home" })} className="shrink-0">
          <Logo variant="dark" />
        </button>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm concert, nghệ sĩ..."
            className="w-full bg-white/[0.04] border border-border text-foreground text-[12px] pl-9 pr-4 py-2 outline-none focus:border-[#CCFF00]/40 focus:bg-white/[0.06] placeholder-muted-foreground transition-colors" />
        </form>

        <div className="flex items-center gap-2.5">
          {/* User area */}
          {isLoggedIn && currentUser ? (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <span className="hidden lg:block">{currentUser.name}</span>
                <div className="w-7 h-7 bg-[#CCFF00] text-black flex items-center justify-center text-[11px] font-black shrink-0">{initials}</div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-[#111111] border border-border shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="text-xs font-bold text-foreground truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{currentUser.email}</div>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { onNav({ page: "my-tickets" }); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-left">
                      <Ticket size={13} /> Vé của tôi
                    </button>
                    <button onClick={() => { onNav({ page: "account-settings" }); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-left">
                      <Settings size={13} /> Cài đặt tài khoản
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <button onClick={() => { onLogout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-[#FF2D20] hover:bg-white/5 transition-colors text-left">
                      <LogOut size={13} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLogin} className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors">Đăng nhập</button>
          )}
          <button onClick={() => onNav({ page: "admin-dashboard" })} className="hidden md:block text-[10px] font-black uppercase tracking-[0.15em] border border-[#CCFF00]/40 text-[#CCFF00] px-3 py-2 hover:bg-[#CCFF00] hover:text-black transition-colors">Admin</button>
          <button onClick={() => onNav({ page: "staff-login" })} className="hidden md:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] border border-purple-500/40 text-purple-400 px-3 py-2 hover:bg-purple-500 hover:text-white transition-colors">
            <Smartphone size={14} /> Staff
          </button>
          <button className="bg-[#CCFF00] text-black text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 hover:bg-white transition-colors">Mua vé</button>
          <button className="md:hidden text-muted-foreground" onClick={() => setOpen(o => !o)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-[#080808] px-6 py-4 flex flex-col gap-4">
          <form onSubmit={handleSearch} className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm concert, nghệ sĩ..."
              className="w-full bg-white/[0.04] border border-border text-foreground text-[12px] pl-9 pr-4 py-2.5 outline-none focus:border-[#CCFF00]/40 placeholder-muted-foreground" />
          </form>
          {isLoggedIn ? (
            <>
              <button onClick={() => { onNav({ page: "my-tickets" }); setOpen(false); }} className="text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">Vé của tôi</button>
              <button onClick={() => { onNav({ page: "account-settings" }); setOpen(false); }} className="text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">Cài đặt tài khoản</button>
              <button onClick={() => { onLogout(); setOpen(false); }} className="text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-[#FF2D20]">Đăng xuất</button>
            </>
          ) : (
            <button onClick={() => { onLogin(); setOpen(false); }} className="text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">Đăng nhập</button>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Login Modal ─────────────────────────────────────────────────────────────

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: { name: string; email: string }) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [emailVal, setEmailVal] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSuccess({ name: nameVal || "Sỹ Văn", email: emailVal || "user@example.com" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <Logo variant="dark" size="sm" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="flex border-b border-border">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${tab === t ? "text-[#CCFF00] border-b-2 border-[#CCFF00]" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {tab === "register" && (
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={nameVal} onChange={e => setNameVal(e.target.value)} placeholder="Họ và tên" className="w-full bg-muted border border-border text-foreground text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-muted-foreground" />
            </div>
          )}
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} placeholder="Email của bạn" className="w-full bg-muted border border-border text-foreground text-sm pl-9 pr-3 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-muted-foreground" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">••</span>
            <input type={showPw ? "text" : "password"} placeholder="Mật khẩu" className="w-full bg-muted border border-border text-foreground text-sm pl-9 pr-10 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-muted-foreground" />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {tab === "login" && <div className="text-right"><a href="#" className="text-[11px] text-[#CCFF00] hover:underline">Quên mật khẩu?</a></div>}
          <button type="submit" className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm py-3 hover:bg-white transition-colors">
            {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" /><span className="text-[10px] text-muted-foreground uppercase tracking-widest">Hoặc</span><div className="flex-1 h-px bg-border" />
          </div>
          <button type="button" className="border border-border text-sm py-3 flex items-center justify-center gap-3 text-foreground hover:border-[#CCFF00]/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Tiếp tục với Google
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Shared Cards ─────────────────────────────────────────────────────────────

function SmallCard({ event, onNav }: { event: typeof EVENTS[0]; onNav: (s: PageState) => void }) {
  return (
    <div onClick={() => onNav({ page: "event-detail", eventId: event.id })}
      className="group overflow-hidden bg-card border border-border cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300">
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {event.tag && <div className="absolute top-2 left-2"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
        <div className="absolute bottom-2 left-3 text-[9px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase">{event.date} · {event.time}</div>
      </div>
      <div className="p-3">
        <h3 style={D} className="text-sm font-bold uppercase tracking-wide text-foreground line-clamp-1">{event.name}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{event.venue}, {event.city}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold">{event.price}đ</span>
          <button className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00] hover:text-black hover:bg-[#CCFF00] px-2 py-0.5 transition-all border border-[#CCFF00]/30 hover:border-[#CCFF00]">Mua vé</button>
        </div>
        <SoldBar pct={event.sold} />
      </div>
    </div>
  );
}

function FeaturedCard({ event, onNav }: { event: typeof EVENTS[0]; onNav: (s: PageState) => void }) {
  return (
    <div onClick={() => onNav({ page: "event-detail", eventId: event.id })}
      className="group relative overflow-hidden border border-border cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 h-full min-h-[480px]">
      <img src={event.image} alt={event.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute top-4 right-0 bg-[#CCFF00]">
        <div style={{ ...D, writingMode: "vertical-rl", transform: "rotate(180deg)" } as React.CSSProperties}
          className="px-1 py-2 text-black text-[9px] font-black tracking-[0.2em] uppercase">FEATURED</div>
      </div>
      {event.tag && <div className="absolute top-4 left-4"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase mb-2">{event.date} · {event.time}</div>
        <h2 style={D} className="text-3xl font-black uppercase italic tracking-tight leading-none text-white mb-1">{event.name}</h2>
        <p className="text-xs text-white/60 mb-3">{event.artist}</p>
        <div className="flex items-center gap-2 text-[11px] text-white/50 mb-4"><MapPin size={10} /><span>{event.venue}, {event.city}</span></div>
        <div className="flex items-center justify-between">
          <div><div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Từ</div><div className="text-xl font-black text-white">{event.price}đ</div></div>
          <button className="bg-[#CCFF00] text-black text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-white transition-colors">Mua vé →</button>
        </div>
        <SoldBar pct={event.sold} />
      </div>
    </div>
  );
}

function TrendingCard({ event, rank, onNav }: { event: typeof EVENTS[0]; rank: number; onNav: (s: PageState) => void }) {
  return (
    <div onClick={() => onNav({ page: "event-detail", eventId: event.id })}
      className="group relative overflow-hidden border border-border cursor-pointer hover:border-[#CCFF00]/40 transition-all duration-300 shrink-0 w-52">
      <div style={{ aspectRatio: "3/4" }} className="relative overflow-hidden">
        <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <span style={D} className="text-5xl font-black italic text-white/20 leading-none select-none">{String(rank).padStart(2, "0")}</span>
        </div>
        {event.tag && <div className="absolute top-3 right-3"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-[9px] font-mono tracking-[0.15em] text-[#CCFF00] uppercase mb-1">{event.date}</div>
          <h3 style={D} className="text-sm font-black uppercase italic text-white leading-tight mb-0.5">{event.name}</h3>
          <p className="text-[10px] text-white/50">{event.city}</p>
          <div className="mt-1"><span className="text-xs font-bold text-white">{event.price}đ</span></div>
          <SoldBar pct={event.sold} />
        </div>
      </div>
    </div>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ onNav }: { onNav: (s: PageState) => void }) {
  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => { setCur(next); setFading(false); }, 280);
  }, []);

  useEffect(() => {
    timer.current = setInterval(() => go((cur + 1) % HERO_SLIDES.length), 5500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cur, go]);

  const s = HERO_SLIDES[cur];

  return (
    <section className="relative pt-14 overflow-hidden" style={{ height: "100svh", minHeight: "600px" }}>
      {/* Background images — all stacked, opacity toggle */}
      {HERO_SLIDES.map((sl, i) => (
        <div key={sl.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === cur ? 1 : 0 }}>
          <img src={sl.image} alt={sl.name} className="w-full h-full object-cover" />
        </div>
      ))}

      {/* Gradient: dark left, fades to transparent right */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #080808 0%, #080808 30%, rgba(8,8,8,0.7) 55%, rgba(8,8,8,0.1) 100%)" }} />
      {/* Bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to top, #080808, transparent)" }} />
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-24" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.5), transparent)" }} />

      {/* Text content */}
      <div className="relative z-10 h-full flex flex-col justify-center max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="max-w-lg" style={{ opacity: fading ? 0 : 1, transition: "opacity 0.28s ease" }}>
          {/* Tag */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-1"
              style={{ backgroundColor: s.accentColor, color: s.accentColor === "#CCFF00" ? "#080808" : "#fff" }}>
              {s.tag}
            </span>
            <span className="text-[10px] font-mono tracking-[0.15em] text-white/35 uppercase">Sự kiện nổi bật</span>
          </div>

          {/* Name */}
          <h1 style={{ ...D, fontSize: "clamp(38px,5.5vw,78px)" }} className="font-black uppercase italic leading-[0.88] tracking-tight text-white mb-3">
            {s.name}
          </h1>

          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/45 mb-3">{s.subtitle}</p>
          <p className="text-sm text-white/55 mb-7 leading-relaxed">{s.artists}</p>

          <div className="flex flex-wrap gap-5 mb-8">
            <div className="flex items-center gap-1.5 text-[11px] text-white/55">
              <Calendar size={11} className="text-[#CCFF00]" />
              <span>{s.date} · {s.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/55">
              <MapPin size={11} className="text-[#CCFF00]" />
              <span>{s.venue}, {s.city}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <div className="text-[9px] text-white/35 uppercase tracking-widest mb-0.5">Vé từ</div>
              <div style={D} className="text-[32px] font-black text-white leading-none">{s.price}đ</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNav({ page: "event-detail", eventId: s.eventId })}
                className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-xs px-6 py-3 hover:bg-white transition-colors flex items-center gap-2">
                Mua vé <ArrowRight size={12} />
              </button>
              <button onClick={() => onNav({ page: "event-detail", eventId: s.eventId })}
                className="border border-white/25 text-white text-xs font-semibold uppercase tracking-[0.1em] px-5 py-3 hover:border-white/50 transition-colors">
                Xem thêm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation strip */}
      <div className="absolute bottom-6 left-0 right-0 z-10 max-w-[1400px] mx-auto px-6 md:px-12 flex items-center gap-3">
        <button onClick={() => go((cur - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-all p-2">
          <ChevronLeft size={15} />
        </button>
        <div className="flex gap-1.5">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => go(i)} className="transition-all duration-300"
              style={{ width: i === cur ? "26px" : "7px", height: "3px", backgroundColor: i === cur ? "#CCFF00" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        <button onClick={() => go((cur + 1) % HERO_SLIDES.length)}
          className="border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-all p-2">
          <ChevronRight size={15} />
        </button>
        <span className="ml-auto font-mono text-[10px] text-white/25">{String(cur + 1).padStart(2, "0")} / {String(HERO_SLIDES.length).padStart(2, "0")}</span>
      </div>
    </section>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

function HomePage({ onNav }: { onNav: (s: PageState) => void }) {
  const [cat, setCat] = useState("Tất cả");
  const trendRef = useRef<HTMLDivElement>(null);
  const filtered = cat === "Tất cả" ? EVENTS : EVENTS.filter(e => e.category === cat);
  const featured = filtered.find(e => e.featured) ?? filtered[0];
  const grid = filtered.filter(e => e.id !== featured?.id).slice(0, 4);

  return (
    <>
      <HeroCarousel onNav={onNav} />

      {/* Ticker */}
      <div className="bg-[#CCFF00] py-2 overflow-hidden">
        <div className="flex items-center gap-8 whitespace-nowrap" style={{ animation: "ticker 32s linear infinite" }}>
          {[...Array(3)].flatMap(() => [
            "🎤 ANH TRAI SAY HI · 14/06 · Hà Nội","★","🎵 RAP VIỆT ALL-STARS · 22/06 · TP.HCM","★",
            "🎧 BINZ × TOULIVER · 05/07 · TP.HCM","★","🔥 MỸ TÂM TOUR · 19/07 · TP.HCM","★","⚡ AFTERPARTY FESTIVAL · 02/08 · TP.HCM","★",
          ]).map((t, i) => <span key={i} className="text-black text-[11px] font-black uppercase tracking-[0.1em] shrink-0">{t}</span>)}
        </div>
      </div>

      {/* Events section */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-px bg-[#CCFF00]" /><span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Nổi Bật</span></div>
            <h2 style={D} className="text-4xl font-black uppercase italic tracking-tight">SỰ KIỆN HOT</h2>
          </div>
          <button className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-[#CCFF00] uppercase tracking-widest transition-colors">Xem tất cả <ArrowRight size={12} /></button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 border transition-all ${cat === c ? "bg-[#CCFF00] text-black border-[#CCFF00]" : "text-muted-foreground border-border hover:border-[#CCFF00]/30 hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured && <div className="lg:col-span-1 lg:row-span-2"><FeaturedCard event={featured} onNav={onNav} /></div>}
            {grid.map(ev => <SmallCard key={ev.id} event={ev} onNav={onNav} />)}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground text-sm">Không có sự kiện nào cho danh mục này.</div>
        )}
      </section>

      {/* Trending */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-px bg-[#FF2D20]" /><span className="text-[10px] font-mono tracking-[0.2em] text-[#FF2D20] uppercase">Đang Hot</span></div>
            <h2 style={D} className="text-4xl font-black uppercase italic tracking-tight">TRENDING TUẦN NÀY</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => trendRef.current?.scrollBy({ left: -260, behavior: "smooth" })} className="border border-border p-2 hover:border-[#CCFF00]/40 hover:text-[#CCFF00] transition-all"><ChevronLeft size={16} /></button>
            <button onClick={() => trendRef.current?.scrollBy({ left: 260, behavior: "smooth" })} className="border border-border p-2 hover:border-[#CCFF00]/40 hover:text-[#CCFF00] transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div ref={trendRef} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {EVENTS.map((ev, i) => <TrendingCard key={ev.id} event={ev} rank={i + 1} onNav={onNav} />)}
        </div>
      </section>

      {/* Upcoming list */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 border-t border-border">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2"><div className="w-5 h-px bg-[#CCFF00]" /><span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Lịch Diễn</span></div>
          <h2 style={D} className="text-4xl font-black uppercase italic tracking-tight">SẮP DIỄN RA</h2>
        </div>
        {UPCOMING.map((ev, i) => (
          <div key={i} onClick={() => onNav({ page: "event-detail", eventId: ev.id })}
            className="group flex items-center gap-4 md:gap-8 py-4 border-b border-border hover:bg-card transition-colors cursor-pointer px-3 -mx-3">
            <span style={D} className="text-2xl font-black italic text-white/10 w-8 shrink-0 text-right">{String(i + 1).padStart(2, "0")}</span>
            <div className="w-14 shrink-0 text-center"><div className="text-[10px] font-mono tracking-widest text-[#CCFF00]">{ev.date}</div></div>
            <span className="hidden md:block shrink-0 text-[9px] font-bold tracking-[0.15em] border border-border text-muted-foreground px-2 py-0.5">{ev.cat}</span>
            <div className="flex-1 min-w-0">
              <h3 style={D} className="font-black uppercase text-sm tracking-wide truncate">{ev.name}</h3>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5"><MapPin size={9} /> {ev.city}</div>
            </div>
            <div className="text-right shrink-0"><div className="text-sm font-bold">{ev.price}</div><div className="text-[10px] text-muted-foreground">Từ</div></div>
            <button className="hidden md:block shrink-0 border border-[#CCFF00]/30 text-[#CCFF00] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 hover:bg-[#CCFF00] hover:text-black transition-all">Mua →</button>
          </div>
        ))}
      </section>

      {/* Promo */}
      <section className="relative overflow-hidden mt-12">
        <img src="https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=1800&h=600&fit=crop&auto=format" alt="Concert crowd" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3"><Ticket size={12} className="text-[#CCFF00]" /><span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Đừng Bỏ Lỡ</span></div>
            <h2 style={D} className="text-5xl md:text-7xl font-black uppercase italic text-white leading-none tracking-tight">VÉ<br /><span className="text-[#CCFF00]">CHÍNH HÃNG</span><br />GIÁ TỐT NHẤT</h2>
            <p className="text-white/50 text-sm mt-4 max-w-sm leading-relaxed">Mua vé trực tiếp từ ban tổ chức — không qua trung gian, không vé giả, hoàn tiền khi hủy sự kiện.</p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <button className="bg-[#CCFF00] text-black font-black uppercase tracking-[0.15em] text-sm px-10 py-4 hover:bg-white transition-colors flex items-center gap-2">Khám phá sự kiện <ArrowRight size={14} /></button>
            <button className="border border-white/30 text-white font-semibold uppercase tracking-[0.12em] text-xs px-10 py-4 hover:border-white transition-colors flex items-center gap-2 justify-center"><Play size={12} /> Xem trailer</button>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="flex items-center gap-2 mb-2"><div className="w-5 h-px bg-[#CCFF00]" /><span className="text-[10px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Thể Loại</span></div>
        <h2 style={D} className="text-4xl font-black uppercase italic tracking-tight mb-8">TÌM THEO THỂ LOẠI</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[{ n: "Nhạc Pop", c: 48, i: "🎤" }, { n: "Rap / Hip-Hop", c: 34, i: "🎧" }, { n: "R&B / Soul", c: 19, i: "🎵" }, { n: "EDM", c: 27, i: "⚡" }, { n: "Rock", c: 15, i: "🎸" }, { n: "Classical", c: 11, i: "🎻" }, { n: "Comedy", c: 22, i: "😂" }, { n: "Indie", c: 16, i: "🌙" }].map(({ n, c, i }) => (
            <button key={n} onClick={() => setCat(n)}
              className="group border border-border bg-card hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 transition-all p-5 text-left">
              <div className="text-2xl mb-3">{i}</div>
              <div style={D} className="text-sm font-bold uppercase tracking-wide text-foreground group-hover:text-[#CCFF00] transition-colors">{n}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c} sự kiện</div>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-4">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <Logo variant="dark" size="lg" />
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[200px]">Nền tảng mua vé sự kiện âm nhạc và giải trí hàng đầu Việt Nam.</p>
            </div>
            {[{ title: "Sự kiện", links: ["Nhạc Pop", "Rap/Hip-Hop", "EDM", "Rock", "Comedy"] }, { title: "Về chúng tôi", links: ["Giới thiệu", "Đối tác", "Tuyển dụng", "Blog"] }, { title: "Hỗ trợ", links: ["Câu hỏi thường gặp", "Liên hệ", "Chính sách hoàn tiền", "Điều khoản"] }].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">{title}</div>
                <div className="flex flex-col gap-2.5">{links.map(l => <a key={l} href="#" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">© 2026 ticketZ. Bảo lưu mọi quyền.</p>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              {["Facebook", "Instagram", "TikTok", "YouTube"].map(s => <a key={s} href="#" className="hover:text-foreground transition-colors">{s}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ─── EVENT DETAIL PAGE ────────────────────────────────────────────────────────

function EventDetailPage({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) ?? EVENTS[0];
  return (
    <div className="min-h-screen">
      <div className="relative h-[52vh] overflow-hidden">
        <img src={event.image.replace("w=700&h=500", "w=1800&h=700").replace("w=800&h=600", "w=1800&h=700")} alt={event.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/50 to-transparent" />
        <button onClick={() => onNav({ page: "home" })} className="absolute top-6 left-6 flex items-center gap-2 text-[11px] font-semibold text-white/60 hover:text-white uppercase tracking-widest transition-colors">
          <ChevronLeft size={14} /> Trở về
        </button>
        <div className="absolute bottom-6 left-6 md:left-12">
          {event.tag && <div className="mb-3"><Tag tag={event.tag} tagStyle={event.tagStyle} /></div>}
          <h1 style={{ ...D, fontSize: "clamp(32px,5.5vw,72px)" }} className="font-black uppercase italic leading-none text-white">{event.name}</h1>
          <p className="text-sm text-white/45 mt-2">{event.subtitle}</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
          <div>
            {/* Info bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[
                { icon: <Calendar size={13} className="text-[#CCFF00]" />, label: "Ngày diễn", value: event.date },
                { icon: <Clock size={13} className="text-[#CCFF00]" />, label: "Giờ bắt đầu", value: event.time },
                { icon: <MapPin size={13} className="text-[#CCFF00]" />, label: "Địa điểm", value: event.venue },
                { icon: <Users size={13} className="text-[#CCFF00]" />, label: "Thành phố", value: event.city },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span></div>
                  <div className="text-sm font-bold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mb-10">
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Về chương trình</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
            </div>

            <div className="mb-10">
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Nghệ sĩ tham gia</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {event.artistList.map((a, i) => (
                  <div key={i} className="bg-card border border-border p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-muted border border-border flex items-center justify-center shrink-0"><Star size={13} className="text-[#CCFF00]" /></div>
                    <div>
                      <div className="text-sm font-bold">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">{a.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Loại vé & Giá</h2>
              <div className="flex flex-col gap-2">
                {ZONES.slice(0, 6).map(z => (
                  <div key={z.id} className="flex items-center justify-between bg-card border border-border px-4 py-3 hover:border-[#CCFF00]/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 shrink-0" style={{ backgroundColor: z.color }} />
                      <div>
                        <div className="text-sm font-bold">{z.name}</div>
                        <div className="text-[10px] text-muted-foreground">{z.type} · Còn {z.available} vé</div>
                      </div>
                    </div>
                    <div className="text-sm font-black">{fmt(z.price)}đ</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky CTA */}
          <div>
            <div className="sticky top-20 bg-card border border-border p-6">
              <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-1">Vé từ</div>
              <div style={D} className="text-4xl font-black text-white mb-1">{event.price}đ</div>
              <SoldBar pct={event.sold} />
              <div className="border-t border-border my-5" />
              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground mb-6">
                {["Vé chính hãng từ ban tổ chức", "Hoàn tiền nếu sự kiện bị hủy", "E-ticket giao ngay qua email", "Thanh toán qua MoMo, VNPAY"].map(t => (
                  <div key={t} className="flex items-center gap-2"><CheckCircle size={12} className="text-[#CCFF00]" /> {t}</div>
                ))}
              </div>
              <button onClick={() => onNav({ page: "seat-map", eventId: event.id })}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors flex items-center justify-center gap-2">
                Chọn khu vực & Mua vé <ArrowRight size={14} />
              </button>
              <button className="w-full mt-2 border border-border text-sm font-semibold py-3 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                Thêm vào lịch nhắc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SEAT MAP PAGE ────────────────────────────────────────────────────────────

function SeatMapPage({ eventId, onNav }: { eventId: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) ?? EVENTS[0];
  const [sel, setSel] = useState<ZoneInfo | null>(null);
  const [qty, setQty] = useState(1);

  function ZoneBtn({ id, label, rows = 1 }: { id: string; label?: string; rows?: number }) {
    const z = ZONES.find(z => z.id === id);
    if (!z) return null;
    const active = sel?.id === id;
    return (
      <button onClick={() => { setSel(z); setQty(1); }}
        className="flex items-center justify-center text-[9px] font-black uppercase tracking-wider border-2 transition-all hover:brightness-110"
        style={{
          backgroundColor: z.color + "30", borderColor: active ? z.color : z.color + "60",
          color: z.color, gridRow: rows > 1 ? `span ${rows}` : undefined,
          padding: "12px 4px",
        }}>
        <span style={{ textAlign: "center", lineHeight: 1.2 }}>{(label ?? z.name).replace(" — ", "\n")}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <button onClick={() => onNav({ page: "event-detail", eventId })} className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-widest"><ChevronLeft size={14} /> Trở về</button>
        <div className="text-center">
          <div style={D} className="text-lg font-black uppercase italic">{event.name}</div>
          <div className="text-[10px] text-muted-foreground">{event.date} · {event.venue}</div>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Map */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 bg-[#0D0D0D]">
          <div className="text-center mb-5">
            <p className="text-[11px] font-mono tracking-[0.2em] text-[#CCFF00] uppercase">Chọn khu vực — Bấm vào sơ đồ</p>
          </div>
          <div className="w-full max-w-xl flex flex-col gap-2">
            {/* Stage */}
            <div className="flex justify-center mb-1">
              <div className="bg-white/8 border border-white/15 px-24 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">STAGE</div>
            </div>
            {/* CAT row top */}
            <div className="grid grid-cols-2 gap-2">
              <ZoneBtn id="cat2a" label="CAT 2A" />
              <ZoneBtn id="cat2b" label="CAT 2B" />
            </div>
            {/* Middle block */}
            <div className="grid grid-cols-[60px_1fr_60px] gap-2">
              <div className="grid grid-rows-2 gap-2">
                <ZoneBtn id="fz-2a" label="GA 2A" />
                <ZoneBtn id="fz-1a" label="GA 1A" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <ZoneBtn id="ozone" label="OZONE" />
              </div>
              <div className="grid grid-rows-2 gap-2">
                <ZoneBtn id="fz-2b" label="GA 2B" />
                <ZoneBtn id="fz-1b" label="GA 1B" />
              </div>
            </div>
            {/* VIP / SVIP / SKY */}
            <div className="grid grid-cols-5 gap-2">
              <ZoneBtn id="vip-a"  label="VIP A" />
              <ZoneBtn id="svip-a" label="SVIP A" />
              <ZoneBtn id="sky"    label="SKY" />
              <ZoneBtn id="svip-b" label="SVIP B" />
              <ZoneBtn id="vip-b"  label="VIP B" />
            </div>
            {/* CAT 1 */}
            <div className="grid grid-cols-[1fr_60px_1fr] gap-2">
              <ZoneBtn id="cat1a" label="CAT 1A" />
              <div className="flex items-center justify-center text-[8px] font-mono tracking-widest text-white/20 border border-white/8">FOH</div>
              <ZoneBtn id="cat1b" label="CAT 1B" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {ZONES.slice(0, 7).map(z => (
              <div key={z.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ backgroundColor: z.color }} />
                <span className="text-[9px] font-mono text-muted-foreground">{z.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-l border-border bg-card flex flex-col">
          <div className="p-5 border-b border-border">
            <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-1">{event.date} · {event.time}</div>
            <div style={D} className="text-xl font-black uppercase italic">{event.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1"><MapPin size={10} />{event.venue}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
            <div className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground uppercase mb-2">Giá vé</div>
            {ZONES.map(z => (
              <button key={z.id} onClick={() => { setSel(z); setQty(1); }}
                className={`flex items-center justify-between px-3 py-2 transition-all border text-left ${sel?.id === z.id ? "border-[#CCFF00]/50 bg-[#CCFF00]/5" : "border-transparent hover:border-border"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: z.color }} />
                  <div><div className="text-xs font-bold">{z.name}</div><div className="text-[9px] text-muted-foreground">{z.type} · {z.available} vé</div></div>
                </div>
                <div className="text-xs font-black">{fmt(z.price)}đ</div>
              </button>
            ))}
          </div>

          {sel ? (
            <div className="p-5 border-t border-border">
              <div className="text-xs font-black uppercase tracking-wide mb-1" style={{ color: sel.color }}>{sel.name}</div>
              <div className="text-[11px] text-muted-foreground mb-4">{sel.type} · Còn {sel.available} vé</div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest flex-1">Số lượng</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 border border-border flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">-</button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(4, q + 1))} className="w-8 h-8 border border-border flex items-center justify-center hover:border-[#CCFF00]/40 transition-all">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] text-muted-foreground">Tổng</span>
                <span style={D} className="text-2xl font-black text-[#CCFF00]">{fmt(sel.price * qty)}đ</span>
              </div>
              <button onClick={() => onNav({ page: "checkout", eventId, zone: sel, qty })}
                className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-sm py-3 hover:bg-white transition-colors">
                Tiếp tục →
              </button>
            </div>
          ) : (
            <div className="p-5 border-t border-border text-center text-[11px] text-muted-foreground">Chọn một khu vực để tiếp tục</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ────────────────────────────────────────────────────────────

function CheckoutPage({ eventId, zone, qty, onNav }: { eventId: number; zone: ZoneInfo; qty: number; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) ?? EVENTS[0];
  const [secs, setSecs] = useState(15 * 60);
  const [pay, setPay] = useState<"momo" | "vnpay" | "card">("momo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const total = zone.price * qty;
  const fee = Math.round(total * 0.02);
  const urgent = secs < 60;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <button onClick={() => onNav({ page: "seat-map", eventId })} className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-widest"><ChevronLeft size={14} /> Quay lại</button>
        <div style={D} className="text-lg font-black uppercase italic">Thanh toán</div>
        <div className="flex items-center gap-2">
          <Clock size={12} className={urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"} />
          <span className={`font-mono font-bold text-sm ${urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"}`}>{mm}:{ss}</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <h2 style={D} className="text-2xl font-black uppercase italic mb-6">Thông tin khán giả</h2>
            <div className="flex flex-col gap-4 mb-8">
              {[
                { label: "Họ và tên *", val: name, set: setName, ph: "Nguyễn Văn A", type: "text" },
                { label: "Email *", val: email, set: setEmail, ph: "email@example.com", type: "email" },
                { label: "Số điện thoại", val: phone, set: setPhone, ph: "0901 234 567", type: "tel" },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground block mb-1.5">{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    className="w-full bg-muted border border-border text-foreground text-sm px-4 py-3 outline-none focus:border-[#CCFF00]/50 placeholder-muted-foreground" />
                </div>
              ))}
            </div>

            <h2 style={D} className="text-2xl font-black uppercase italic mb-4">Phương thức thanh toán</h2>
            <div className="flex flex-col gap-3 mb-8">
              {[
                { id: "momo" as const, label: "MoMo", sub: "Ví điện tử MoMo", dot: "#D82D8B" },
                { id: "vnpay" as const, label: "VNPAY", sub: "QR Code & Thẻ ngân hàng", dot: "#E31837" },
                { id: "card" as const, label: "Thẻ quốc tế", sub: "Visa, Mastercard, JCB", dot: "#1A56DB" },
              ].map(p => (
                <button key={p.id} onClick={() => setPay(p.id)}
                  className={`flex items-center gap-4 p-4 border-2 transition-all text-left ${pay === p.id ? "border-[#CCFF00]" : "border-border hover:border-border/80"}`}>
                  <div className="w-4 h-4 border-2 flex items-center justify-center shrink-0" style={{ borderColor: pay === p.id ? "#CCFF00" : "rgba(255,255,255,0.15)" }}>
                    {pay === p.id && <div className="w-2 h-2 bg-[#CCFF00]" />}
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: p.dot + "20" }}>
                    <div className="w-3 h-3" style={{ backgroundColor: p.dot }} />
                  </div>
                  <div><div className="text-sm font-bold">{p.label}</div><div className="text-[11px] text-muted-foreground">{p.sub}</div></div>
                </button>
              ))}
            </div>

            <button onClick={() => setAgreed(a => !a)} className="flex items-start gap-3 text-left mb-8">
              <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agreed ? "border-[#CCFF00] bg-[#CCFF00]" : "border-border"}`}>
                {agreed && <X size={10} className="text-black" />}
              </div>
              <span className="text-[11px] text-muted-foreground leading-relaxed">Tôi đã đọc và đồng ý với <span className="text-[#CCFF00]">Điều khoản sử dụng</span> và <span className="text-[#CCFF00]">Chính sách hoàn tiền</span> của ticketZ.</span>
            </button>

            <button onClick={() => { if (name && email && agreed) onNav({ page: "eticket", eventId, zone, qty, holderName: name }); }}
              disabled={!name || !email || !agreed}
              className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] py-4 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Xác nhận & Thanh toán {fmt(total + fee)}đ →
            </button>
          </div>

          {/* Order summary */}
          <div>
            <div className="sticky top-20">
              <div className="bg-card border border-border p-5 mb-3">
                <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-3">Thông tin đặt vé</div>
                <div style={D} className="text-xl font-black uppercase italic mb-1">{event.name}</div>
                <div className="text-[11px] text-muted-foreground mb-4">{event.date} · {event.time} · {event.venue}</div>
                <div className="border-t border-border pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-bold">{zone.name}</div><div className="text-[10px] text-muted-foreground">{zone.type} · x{qty}</div></div>
                    <div className="text-sm font-bold">{fmt(total)}đ</div>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Phí dịch vụ (2%)</span><span>+{fmt(fee)}đ</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Tổng cộng</span>
                    <span style={D} className="text-2xl font-black text-[#CCFF00]">{fmt(total + fee)}đ</span>
                  </div>
                </div>
              </div>
              <div className={`bg-card border p-4 flex items-center gap-4 ${urgent ? "border-[#FF2D20]/40" : "border-border"}`}>
                <AlertCircle size={14} className={urgent ? "text-[#FF2D20] shrink-0" : "text-[#CCFF00] shrink-0"} />
                <div>
                  <div className="text-[11px] font-bold">Vé được giữ trong</div>
                  <div className={`font-mono text-xl font-black ${urgent ? "text-[#FF2D20]" : "text-[#CCFF00]"}`}>{mm}:{ss}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── E-TICKET PAGE ────────────────────────────────────────────────────────────

function ETicketPage({ eventId, zone, qty, holderName, onNav }: { eventId: number; zone: ZoneInfo; qty: number; holderName: string; onNav: (s: PageState) => void }) {
  const event = EVENTS.find(e => e.id === eventId) ?? EVENTS[0];
  const ticketNo = "VT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const total = zone.price * qty;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#050505]">
      <div className="flex items-center gap-2 mb-8">
        <CheckCircle size={16} className="text-[#CCFF00]" />
        <span className="text-[#CCFF00] font-bold text-sm uppercase tracking-[0.12em]">Thanh toán thành công — E-ticket đã gửi qua email</span>
      </div>

      {/* TICKET */}
      <div className="w-full max-w-[640px]">
        <div className="relative overflow-hidden border border-white/10 bg-[#111]">
          {/* Top accent stripe */}
          <div className="h-1.5 w-full" style={{ backgroundColor: zone.color }} />

          {/* Top section */}
          <div className="p-7 pb-5">
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <div className="text-[10px] font-mono tracking-[0.25em] text-muted-foreground uppercase mb-1 flex items-center gap-2">
                  <span>ticketZ — E-TICKET</span>
                </div>
                <h1 style={{ ...D, fontSize: "clamp(28px,4.5vw,52px)" } as React.CSSProperties}
                  className="font-black uppercase italic leading-none text-white">{event.name}</h1>
                <p className="text-sm font-semibold tracking-[0.06em] mt-1.5" style={{ color: zone.color }}>{event.subtitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-mono text-muted-foreground mb-1">VÉ SỐ</div>
                <div className="font-mono font-bold text-sm" style={{ color: zone.color }}>{ticketNo}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Ngày diễn", value: event.date },
                { label: "Giờ vào cổng", value: event.time },
                { label: "Địa điểm", value: event.venue },
                { label: "Thành phố", value: event.city },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-1">{label}</div>
                  <div className="text-sm font-bold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-1">Nghệ sĩ</div>
              <div className="text-xs text-white/60">{event.artistList.map(a => a.name).join(" · ")}</div>
            </div>
          </div>

          {/* Perforation */}
          <div className="flex items-center">
            <div className="w-5 h-5 -ml-2.5" style={{ borderRadius: "50%", backgroundColor: "#050505", borderRight: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex-1 border-t border-dashed border-white/12" />
            <div className="w-5 h-5 -mr-2.5" style={{ borderRadius: "50%", backgroundColor: "#050505", borderLeft: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* Bottom section */}
          <div className="p-7 pt-5 flex flex-col sm:flex-row items-center gap-8">
            {/* Zone + holder */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 shrink-0" style={{ backgroundColor: zone.color }} />
                <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground">Khu vực</div>
              </div>
              <div style={{ ...D, color: zone.color }} className="text-5xl font-black uppercase italic leading-none mb-3">{zone.name}</div>
              <div className="text-[11px] text-muted-foreground mb-5">{zone.type} · {qty} vé</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-1">Khán giả</div>
                  <div className="text-sm font-bold text-white">{holderName}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-1">Giá trị</div>
                  <div style={D} className="text-xl font-black text-white">{fmt(total)}đ</div>
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="bg-white p-3">
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  <rect width="100" height="100" fill="white" />
                  {/* Simulated data cells */}
                  {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => {
                    const skip = (r < 4 && c < 4) || (r < 4 && c > 5) || (r > 5 && c < 4);
                    if (skip) return null;
                    const on = (r * 11 + c * 7 + r * c * 3) % 3 !== 0;
                    return on ? <rect key={`${r}${c}`} x={c * 12 + 2} y={r * 12 + 2} width={10} height={10} fill="black" /> : null;
                  }))}
                  {/* Corner markers */}
                  {([[2, 2], [58, 2], [2, 58]] as [number, number][]).map(([x, y], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width={32} height={32} fill="black" />
                      <rect x={x + 4} y={y + 4} width={24} height={24} fill="white" />
                      <rect x={x + 9} y={y + 9} width={14} height={14} fill="black" />
                    </g>
                  ))}
                </svg>
              </div>
              <div className="font-mono text-[9px] text-muted-foreground tracking-[0.12em]">{ticketNo}</div>
              <div className="text-[9px] text-muted-foreground">Quét tại cổng vào</div>
            </div>
          </div>

          <div className="h-px w-full" style={{ backgroundColor: zone.color + "30" }} />
        </div>

        <div className="text-center mt-3 text-[9px] font-mono text-muted-foreground tracking-[0.15em]">
          VÉ ĐIỆN TỬ · KHÔNG CẦN IN · CHỈ SỬ DỤNG MỘT LẦN · TICKETZ.VN
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <button className="flex items-center gap-2 bg-[#CCFF00] text-black font-black uppercase tracking-[0.12em] text-xs px-6 py-3 hover:bg-white transition-colors">
          <Download size={13} /> Tải về PDF
        </button>
        <button onClick={() => onNav({ page: "home" })} className="border border-border text-muted-foreground font-semibold text-xs uppercase tracking-widest px-6 py-3 hover:border-foreground/30 hover:text-foreground transition-colors">
          Về trang chủ
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<PageState>({ page: "home" });
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  function nav(s: PageState) {
    setPage(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLoginSuccess(user: { name: string; email: string }) {
    setIsLoggedIn(true);
    setCurrentUser(user);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setCurrentUser(null);
    nav({ page: "home" });
  }

  const hideNav = page.page === "eticket";
  const isAdmin = page.page.startsWith("admin-");
  const isStaff = page.page.startsWith("staff-");

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {!hideNav && !isAdmin && !isStaff && (
        <Navbar onNav={nav} onLogin={() => setLoginOpen(true)} onLogout={handleLogout} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      )}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />}

      <main className={!hideNav && !isAdmin && !isStaff && page.page !== "home" ? "pt-14" : ""}>
        {page.page === "home"             && <HomePage onNav={nav} />}
        {page.page === "event-detail"     && <EventDetailPage eventId={page.eventId} onNav={nav} />}
        {page.page === "seat-map"         && <SeatMapPage eventId={page.eventId} onNav={nav} />}
        {page.page === "checkout"         && <CheckoutPage eventId={page.eventId} zone={page.zone} qty={page.qty} onNav={nav} />}
        {page.page === "eticket"          && <ETicketPage eventId={page.eventId} zone={page.zone} qty={page.qty} holderName={page.holderName} onNav={nav} />}
        {page.page === "my-tickets"       && <MyTicketsPage onNav={nav} />}
        {page.page === "account-settings" && <AccountSettingsPage onNav={nav} currentUser={currentUser} onLogout={handleLogout} />}
        {page.page === "search-results"   && <SearchResultsPage query={page.query} onNav={nav} />}

        {/* Admin Pages */}
        {page.page === "admin-dashboard" && <AdminDashboard onNav={nav} />}
        {page.page === "admin-concerts"  && <AdminConcerts onNav={nav} />}
        {page.page === "admin-orders"    && <AdminOrders onNav={nav} />}
        {page.page === "admin-tickets"   && <AdminTickets onNav={nav} />}
        {page.page === "admin-users"     && <AdminUsers onNav={nav} />}
        {page.page === "admin-guests"    && <AdminGuests onNav={nav} />}
        {page.page === "admin-ai-bio"    && <AdminAIBio onNav={nav} />}
        {page.page === "admin-checkin"   && <AdminCheckin onNav={nav} />}

        {/* Mobile Staff Pages */}
        {page.page === "staff-login"        && <StaffLogin onNav={nav} />}
        {page.page === "staff-event-select" && <StaffEventSelect onNav={nav} />}
        {page.page === "staff-sync"         && <StaffSync eventId={page.eventId} onNav={nav} />}
        {page.page === "staff-scanner"      && <StaffScanner eventId={page.eventId} onNav={nav} />}
        {page.page === "staff-history"      && <StaffHistory eventId={page.eventId} onNav={nav} />}
        {page.page === "staff-settings"     && <StaffSettings eventId={page.eventId} onNav={nav} />}
      </main>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        /* Mobile Staff App */
        @media (max-width: 768px) {
          .safe-area-inset-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
}
