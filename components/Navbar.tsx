import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Dna } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navClasses = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-300 hover:text-white ${
      isActive ? 'text-white' : 'text-neutral-400'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${
        scrolled || isOpen
          ? 'bg-neutral-950/80 backdrop-blur-md border-neutral-800 py-4'
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-neutral-900 rounded-lg group-hover:bg-neutral-800 transition-colors border border-neutral-800">
            <Dna className="w-5 h-5 text-neutral-200" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-100">
            Lucas Zeiger
          </span>
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" className={navClasses}>
            About
          </NavLink>
          <NavLink to="/research" className={navClasses}>
            Research
          </NavLink>
          <NavLink to="/cv" className={navClasses}>
            CV
          </NavLink>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-neutral-400 hover:text-white focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-neutral-950 border-b border-neutral-800 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-6 py-8">
          <NavLink to="/" className={navClasses}>
            About
          </NavLink>
          <NavLink to="/research" className={navClasses}>
            Research
          </NavLink>
          <NavLink to="/cv" className={navClasses}>
            CV
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;