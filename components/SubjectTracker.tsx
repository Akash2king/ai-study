
import React, { useState } from 'react';
import ChartIcon from './icons/ChartIcon';
import TrashIcon from './icons/TrashIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import TargetIcon from './icons/TargetIcon';
import { useStudyContext } from '../contexts/StudyContext';

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

const SubjectTracker: React.FC = () => {
  const { subjects, tasks, goals, addSubject, updateSubject, deleteSubject } = useStudyContext();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName);
    setNewSubjectName('');
    setIsAdding(false);
  };

  // Statistics
  const totalSubjects = subjects.length;
  const avgProgress = totalSubjects > 0 
    ? Math.round(subjects.reduce((acc, curr) => acc + curr.progress, 0) / totalSubjects) 
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
        <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
            {isAdding ? 'Cancel' : '+ Add Subject'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubject} className="bg-gray-800 p-4 rounded-lg mb-6 flex gap-4 animate-fade-in border border-gray-700">
            <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="Subject Name (e.g., Machine Learning)"
            className="flex-grow bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            autoFocus
            />
            <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            disabled={!newSubjectName.trim()}
            >
            Save
            </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length === 0 ? (
             <div className="col-span-full bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4 text-gray-500">
                    <ChartIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
                <p className="text-gray-400">Add a subject manually or generate a course to get started.</p>
            </div>
        ) : (
            subjects.map(subject => (
            <div key={subject.id} className="group bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 relative overflow-hidden">
                {/* Progress Background Overlay */}
                <div 
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500"
                    style={{ width: `${subject.progress}%` }}
                />
                
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{subject.name}</h3>
                        <button
                            onClick={() => deleteSubject(subject.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Subject"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-sm text-gray-400">Progress</span>
                        <span className="text-2xl font-bold text-white">{subject.progress}%</span>
                    </div>

                    <div className="w-full bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out relative" 
                            style={{ width: `${subject.progress}%` }}
                        >
                             <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-20 w-full h-full animate-pulse"></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Update Progress</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={subject.progress}
                            onChange={(e) => updateSubject(subject.id, { progress: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SubjectTracker;
