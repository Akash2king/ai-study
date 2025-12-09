
import React, { useState, useEffect } from 'react';
import ChartIcon from './icons/ChartIcon';
import TrashIcon from './icons/TrashIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import TargetIcon from './icons/TargetIcon';
import { useStudyContext } from '../contexts/StudyContext';
import { CourseData } from '../types';
import { getCoursesByUserId } from '../services/databaseService';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
            {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
        </div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
    </div>
);

interface SubjectTrackerProps {
    userId: string;
    onSelectCourse: (course: CourseData) => void;
}

const SubjectTracker: React.FC<SubjectTrackerProps> = ({ userId, onSelectCourse }) => {
  const { tasks, goals } = useStudyContext();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, [userId]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const userCourses = await getCoursesByUserId(userId);
      setCourses(userCourses);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const totalSubjects = courses.length;
  const avgProgress = totalSubjects > 0 
    ? Math.round(courses.reduce((acc, curr) => acc + (curr.progress?.progressPercentage || 0), 0) / totalSubjects) 
    : 0;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const activeGoals = goals.filter(g => !g.achieved).length;

  return (
    <div className="p-8 h-full flex flex-col bg-gray-900 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your learning progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
            title="Active Subjects" 
            value={totalSubjects} 
            icon={<ChartIcon />} 
            color="bg-blue-500 text-blue-400" 
        />
        <StatCard 
            title="Average Progress" 
            value={`${avgProgress}%`} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} 
            color="bg-green-500 text-green-400" 
        />
        <StatCard 
            title="Pending Tasks" 
            value={pendingTasks} 
            icon={<ClipboardIcon />} 
            color="bg-yellow-500 text-yellow-400" 
        />
        <StatCard 
            title="Active Goals" 
            value={activeGoals} 
            icon={<TargetIcon />} 
            color="bg-purple-500 text-purple-400" 
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">My Subjects</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="col-span-full bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4 text-gray-500">
            <ChartIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No courses yet</h3>
          <p className="text-gray-400">Generate your first course to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const progressPercentage = course.progress?.progressPercentage || 0;
            const totalSections = course.modules.reduce((acc, mod) => acc + mod.sections.length, 0);
            const completedSections = course.progress?.completedSections.length || 0;
            
            return (
              <div 
                key={course.id} 
                onClick={() => onSelectCourse(course)}
                className="group bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 relative overflow-hidden cursor-pointer"
              >
                {/* Progress Background Overlay */}
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {course.introduction}
                  </p>
                  
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-sm text-gray-400">Progress</span>
                    <span className="text-2xl font-bold text-white">{Math.round(progressPercentage)}%</span>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out relative" 
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-20 w-full h-full animate-pulse"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{course.modules.length} modules</span>
                    <span>{completedSections} / {totalSections} sections</span>
                  </div>
                  
                  {course.progress?.lastAccessedAt && (
                    <div className="mt-3 text-xs text-gray-500">
                      Last accessed: {new Date(course.progress.lastAccessedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubjectTracker;
