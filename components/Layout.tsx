import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-white/20 selection:text-white">
      <Navbar />
      <main className="flex-grow pt-24 md:pt-32">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
