import React from "react";
import { useSidebar } from "../context/SidebarContext";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between px-3 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg dark:border-gray-800 dark:text-gray-400"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? "✖" : "☰"}
          </button>

          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            Renault CDC Viewer
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Upload → Charts
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
