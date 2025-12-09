import React, { useState, useEffect } from 'react';
import { CourseData } from '../types';
import { getCoursesByUserId, deleteCourse } from '../services/databaseService';
import BookIcon from './icons/BookIcon';
import TrashIcon from './icons/TrashIcon';

interface MyCoursesProps {
  userId: string;
  onSelectCourse: (course: CourseData) => void;
}

const MyCourses: React.FC<MyCoursesProps> = ({ userId, onSelectCourse }) => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.introduction.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 20) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-800">
        <h1 className="text-3xl font-bold text-white mb-4">My Courses</h1>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search courses..."
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</span>
          <button
            onClick={loadCourses}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No courses found matching your search.' : 'No courses yet. Start generating your first course!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-blue-500 transition-all cursor-pointer group"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCourse(course.id!, e)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete course"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Course Description */}
                <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                  {course.introduction}
                </p>

                {/* Course Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{course.modules.length} modules</span>
                    <span>
                      {course.modules.reduce((acc, mod) => acc + mod.sections.length, 0)} sections
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {course.progress && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(course.progress.progressPercentage)}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(course.progress.progressPercentage)} transition-all duration-500`}
                          style={{ width: `${course.progress.progressPercentage}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {course.progress.completedSections.length} / {course.modules.reduce((acc, mod) => acc + mod.sections.length, 0)} sections completed
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500">
                    {course.progress?.lastAccessedAt
                      ? `Last accessed: ${new Date(course.progress.lastAccessedAt).toLocaleDateString()}`
                      : `Created: ${new Date(course.timestamp || 0).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
