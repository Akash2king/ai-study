
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CourseGenerator from './components/CourseGenerator';
import MyCourses from './components/MyCourses';
import StudyTimer from './components/StudyTimer';
import TaskBoard from './components/TaskBoard';
import SubjectTracker from './components/SubjectTracker';
import GoalTracker from './components/GoalTracker';
import { AppView, UserProfile, CourseData } from './types';
import { StudyProvider } from './contexts/StudyContext';
import { getCurrentUser, saveUser, generateUserId } from './services/databaseService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SUBJECT_TRACKER);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      let user = await getCurrentUser();
      
      if (!user) {
        // Create default user if none exists
        user = {
          id: generateUserId(),
          name: 'Student',
          email: 'student@study.ai',
          createdAt: Date.now()
        };
        await saveUser(user);
      }
      
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to initialize user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = (course: CourseData) => {
    setSelectedCourse(course);
    setCurrentView(AppView.COURSE_GENERATOR);
  };

  const renderView = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case AppView.COURSE_GENERATOR:
        return <CourseGenerator userId={currentUser.id} initialCourse={selectedCourse} />;
      case AppView.TASK_BOARD:
        return <TaskBoard />;
      case AppView.SUBJECT_TRACKER:
        return <SubjectTracker userId={currentUser.id} onSelectCourse={handleSelectCourse} />;
      case AppView.GOAL_TRACKER:
        return <GoalTracker />;
      case AppView.STUDY_TIMER:
        return <StudyTimer />;
      default:
        return <SubjectTracker userId={currentUser.id} onSelectCourse={handleSelectCourse} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <StudyProvider userId={currentUser.id}>
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
