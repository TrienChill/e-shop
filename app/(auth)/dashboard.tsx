
import { LayoutGrid, LogOut, Shirt, Sparkles, User } from 'lucide-react-native';
import React from 'react';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  return (
    <div className="flex flex-col h-full bg-background-light">
      {/* Top Header */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Welcome back,</h2>
          <h1 className="text-2xl font-bold font-serif text-[#1A1A1A]">Alex Chen</h1>
        </div>
        <button 
          onClick={onLogout}
          className="p-3 bg-white shadow-sm rounded-2xl hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 space-y-6 overflow-y-auto pb-24">
        {/* Daily Insight Card */}
        <div className="bg-primary p-6 rounded-[2rem] text-white relative overflow-hidden group shadow-xl shadow-primary/30">
          <div className="relative z-10">
            <h3 className="text-sm font-medium opacity-80 mb-1">Stylist Recommendation</h3>
            <p className="text-lg font-bold mb-4">You have 3 new looks ready for your evening gala.</p>
            <button className="bg-white text-primary px-6 py-2.5 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform">
              View Picks
            </button>
          </div>
          <Sparkles className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 group-hover:scale-110 transition-transform" />
        </div>

        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h4 className="font-bold text-[#1A1A1A]">Your Closet</h4>
            <button className="text-primary text-xs font-bold">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] bg-white rounded-[2rem] p-2 shadow-sm border border-gray-100 overflow-hidden relative group">
                <img 
                  src={`https://picsum.photos/seed/${i + 20}/400/500`} 
                  alt="Fashion"
                  className="w-full h-full object-cover rounded-[1.75rem] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Evening</p>
                  <p className="font-bold">Minimalist {i}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-8 left-6 right-6 h-20 bg-[#1A1A1A] rounded-full shadow-2xl flex items-center justify-around px-4">
        <button className="p-3 text-white">
          <LayoutGrid size={24} />
        </button>
        <button className="p-3 text-white/50 hover:text-white transition-colors">
          <Shirt size={24} />
        </button>
        <button className="p-4 bg-primary text-white rounded-full shadow-lg -mt-12 border-4 border-background-light">
          <Sparkles size={28} />
        </button>
        <button className="p-3 text-white/50 hover:text-white transition-colors">
          <User size={24} />
        </button>
        <button className="p-3 text-white/50 hover:text-white transition-colors">
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
