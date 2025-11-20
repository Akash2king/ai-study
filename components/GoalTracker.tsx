
import React, { useState } from 'react';
import TargetIcon from './icons/TargetIcon';
import TrashIcon from './icons/TrashIcon';
import { useStudyContext } from '../contexts/StudyContext';

const GoalTracker: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useStudyContext();
  const [newGoalText, setNewGoalText] = useState('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    addGoal(newGoalText);
    setNewGoalText('');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center mb-8">
        <TargetIcon className="w-8 h-8 text-purple-400 mr-3" />
        <h1 className="text-3xl font-bold">Study Goals</h1>
      </div>

      <form onSubmit={handleAddGoal} className="bg-gray-800 p-6 rounded-lg mb-8 flex gap-4">
        <input
          type="text"
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          placeholder="Set a new goal..."
          className="flex-grow bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          disabled={!newGoalText.trim()}
        >
          Set Goal
        </button>
      </form>

      <div className="flex-grow overflow-y-auto bg-gray-800 rounded-lg p-4">
        {goals.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No goals set. Aim high and start today!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {goals.map(goal => (
              <div 
                key={goal.id} 
                className={`flex items-center justify-between p-5 rounded-lg border border-gray-700 transition-all ${goal.achieved ? 'bg-purple-900/30 border-purple-500/50' : 'bg-gray-750 hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-4 flex-grow">
                  <button
                    onClick={() => updateGoal(goal.id, { achieved: !goal.achieved })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${goal.achieved ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-500 text-transparent hover:border-purple-400'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <span className={`text-lg font-medium ${goal.achieved ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {goal.text}
                  </span>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-gray-500 hover:text-red-400 p-2 opacity-60 hover:opacity-100"
                >
                   <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalTracker;
