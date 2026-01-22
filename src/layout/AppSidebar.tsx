import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isWide = isExpanded || isHovered || isMobileOpen;

  const itemClass = (active: boolean) =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
      active
        ? "bg-brand-500 text-white"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
      !isWide ? "justify-center" : "",
    ].join(" ");

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isWide ? "w-[290px]" : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isWide ? "lg:justify-center" : "justify-start"}`}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/images/logo/logo-icon.svg"
            alt="Logo"
            width={32}
            height={32}
          />
          {isWide && (
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              Renault CDC
            </span>
          )}
        </Link>
      </div>

      <nav className="flex flex-col gap-2">
        {/* Upload */}
        <Link
          to="/upload"
          className={itemClass(
            location.pathname === "/upload" || location.pathname === "/"
          )}
        >
          <span>⬆️</span>
          {isWide && <span>Upload</span>}
        </Link>

        {/* Test Viewer */}
        <Link
          to="/tests"
          className={itemClass(location.pathname === "/tests")}
        >
          <span>📈</span>
          {isWide && <span>Test Viewer</span>}
        </Link>
         {/* 🔴 LIVE Test Viewer */}
      <Link
  to="/live"
  className={itemClass(location.pathname === "/live")}
>
  <span>🔴</span>
  {isWide && <span>Live Test</span>}
</Link>

        {/* ✅ Characterization */}
        <Link
          to="/characterization"
          className={itemClass(location.pathname === "/characterization")}
        >
          <span>📊</span>
          {isWide && <span>Characterization</span>}
        </Link>
      </nav>

      {isWide && (
        <div className="mt-auto mb-6 text-xs text-gray-400">
          CDC tool • minimal menu
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
