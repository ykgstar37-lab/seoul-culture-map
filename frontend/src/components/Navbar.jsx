import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { label: "Culture Map", icon: MapIcon, path: "/" },
  { label: "Analytics", icon: ChartIcon, path: "/analytics" },
  { label: "Course", icon: CourseIcon, path: "/course" },
  { label: "Favorites", icon: HeartIcon, path: "/favorites" },
];

export default function Navbar({ onToggleFavorites, favoritesCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm relative">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-yellow-400 flex items-center justify-center">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="text-base md:text-lg font-bold text-gray-800 tracking-tight">Seoul Culture</span>
      </div>

      {/* Desktop nav tabs */}
      <div className="hidden md:flex items-center gap-1 bg-gray-100/60 rounded-xl p-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-yellow-400 text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Desktop right icons */}
      <div className="hidden md:flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-gray-100/60 transition-colors text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {onToggleFavorites && (
          <button
            onClick={onToggleFavorites}
            className="p-2 rounded-xl hover:bg-gray-100/60 transition-colors text-gray-500 relative"
          >
            <HeartIcon className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full text-[10px] font-bold text-gray-900 flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>
        )}
        <button className="p-2 rounded-xl hover:bg-gray-100/60 transition-colors text-gray-500 relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 text-xs font-bold">Y</div>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden p-2 rounded-xl hover:bg-gray-100/60 transition-colors text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-3 z-50 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-yellow-400 text-gray-900 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100/60"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

function MapIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>);
}
function ChartIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
}
function CourseIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>);
}
function HeartIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>);
}
