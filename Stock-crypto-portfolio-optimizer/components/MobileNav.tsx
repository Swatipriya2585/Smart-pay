import React from 'react';
import { useRouter } from 'next/router';
import { 
  HomeIcon, 
  CreditCardIcon, 
  ChartBarIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

interface MobileNavProps {
  currentPage?: string;
}

export default function MobileNav({ currentPage = 'home' }: MobileNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'home', label: 'Home', icon: HomeIcon, path: '/home' },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon, path: '/payments' },
    { id: 'portfolio', label: 'Portfolio', icon: ChartBarIcon, path: '/portfolio' },
    { id: 'profile', label: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="mobile-nav">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="mobile-nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
} 