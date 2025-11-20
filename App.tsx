
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import CourseGenerator from './components/CourseGenerator';
import StudyTimer from './components/StudyTimer';
import TaskBoard from './components/TaskBoard';
import SubjectTracker from './components/SubjectTracker';
import GoalTracker from './components/GoalTracker';
import { AppView } from './types';
import { StudyProvider } from './contexts/StudyContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SUBJECT_TRACKER);

  const renderView = () => {
    switch (currentView) {
      case AppView.COURSE_GENERATOR:
        return <CourseGenerator />;
      case AppView.TASK_BOARD:
        return <TaskBoard />;
      case AppView.SUBJECT_TRACKER:
        return <SubjectTracker />;
      case AppView.GOAL_TRACKER:
        return <GoalTracker />;
      case AppView.STUDY_TIMER:
        return <StudyTimer />;
      default:
        return <SubjectTracker />;
    }
  };

  return (
    <StudyProvider>
      <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </StudyProvider>
  );
};

export default App;
