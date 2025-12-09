
import React from 'react';
import { AppView } from '../types';
import BrainIcon from './icons/BrainIcon';
import TimerIcon from './icons/TimerIcon';
import SparklesIcon from './icons/SparklesIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import ChartIcon from './icons/ChartIcon';
import TargetIcon from './icons/TargetIcon';
import DatabaseStats from './DatabaseStats';

interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  view: AppView;
  currentView: AppView;
  onClick: (view: AppView) => void;
}> = ({ icon, label, view, currentView, onClick }) => {
  const isActive = view === currentView;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
      <div className="flex items-center mb-8 px-2">
        <SparklesIcon className="w-8 h-8 text-blue-400" />
        <h1 className="ml-2 text-xl font-bold text-white">AI Study Assistant</h1>
      </div>
      <nav className="flex flex-col space-y-2">
        <NavItem
          icon={<ChartIcon className="w-5 h-5" />}
          label="Dashboard"
          view={AppView.SUBJECT_TRACKER}
          currentView={currentView}
          onClick={setCurrentView}
        />
        <NavItem
          icon={<BrainIcon className="w-5 h-5" />}
          label="Generate Course"
          view={AppView.COURSE_GENERATOR}
          currentView={currentView}
          onClick={setCurrentView}
        />
        <NavItem
          icon={<ClipboardIcon className="w-5 h-5" />}
          label="Task Management"
          view={AppView.TASK_BOARD}
          currentView={currentView}
          onClick={setCurrentView}
        />
        <NavItem
          icon={<TargetIcon className="w-5 h-5" />}
          label="Study Goals"
          view={AppView.GOAL_TRACKER}
          currentView={currentView}
          onClick={setCurrentView}
        />
        <NavItem
          icon={<TimerIcon className="w-5 h-5" />}
          label="Study Timer"
          view={AppView.STUDY_TIMER}
          currentView={currentView}
          onClick={setCurrentView}
        />
      </nav>
      <div className="mt-auto space-y-4">
        <DatabaseStats />
        <div className="text-center text-xs text-gray-500 p-4">
          <p>The Future of Learning</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
